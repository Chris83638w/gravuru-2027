//! Preisfunktion und Kassenprüfung des gravuru-Konfigurators.
//!
//! Rechnet dasselbe wie `shopify/funktion/logik.mjs` (dort stehen die Regeln in Worten).
//! Rust, weil die Unterschriftsprüfung (HMAC-SHA-256) je Zeile in JavaScript das Rechenlimit
//! von Shopify nach wenigen Positionen erreicht. `test/funktion-rust.test.mjs` vergleicht
//! diese Fassung Zeile für Zeile mit der JavaScript-Referenz.
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha256;

#[derive(Deserialize)]
pub struct Eingabe {
    #[serde(rename = "buyerJourney")]
    pub kaeufer: Option<Kaeufer>,
    pub shop: Option<Shop>,
    pub cart: Warenkorb,
}
#[derive(Deserialize)]
pub struct Kaeufer { pub step: Option<String> }
#[derive(Deserialize)]
pub struct Shop {
    pub schluessel: Option<Wert>,
    #[serde(rename = "localTime")]
    pub zeit: Option<Zeit>,
}
#[derive(Deserialize)]
pub struct Zeit { pub date: Option<String> }
#[derive(Deserialize)]
pub struct Wert { pub value: Option<String> }
#[derive(Deserialize)]
pub struct Warenkorb { pub lines: Vec<Zeile> }
#[derive(Deserialize)]
pub struct Zeile {
    pub id: String,
    pub quantity: i64,
    pub cost: Option<Kosten>,
    pub gestaltung: Option<Wert>,
    pub preis: Option<Wert>,
    pub merchandise: Option<Ware>,
}
#[derive(Deserialize)]
pub struct Kosten {
    #[serde(rename = "amountPerQuantity")]
    pub je_stueck: Option<Betrag>,
}
#[derive(Deserialize)]
pub struct Betrag { pub amount: Value }
#[derive(Deserialize)]
pub struct Ware {
    #[serde(rename = "__typename")]
    pub art: Option<String>,
    pub id: Option<String>,
    pub product: Option<Produkt>,
}
#[derive(Deserialize)]
pub struct Produkt { pub title: Option<String>, pub konfi: Option<Wert> }

pub enum Bewertung { Fremd, Ok { stueck: i64, variante: i64 }, Gesperrt(&'static str) }

const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
fn base64_url(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 4 / 3 + 3);
    for chunk in bytes.chunks(3) {
        let n = ((chunk[0] as u32) << 16) | ((*chunk.get(1).unwrap_or(&0) as u32) << 8) | (*chunk.get(2).unwrap_or(&0) as u32);
        out.push(ALPHABET[(n >> 18) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 63) as usize] as char);
        if chunk.len() > 1 { out.push(ALPHABET[((n >> 6) & 63) as usize] as char); }
        if chunk.len() > 2 { out.push(ALPHABET[(n & 63) as usize] as char); }
    }
    out
}

fn staffel_gueltig(text: &str) -> bool {
    text == "0" || (!text.is_empty() && text.split('_').all(|teil| {
        let mut seiten = teil.split('x');
        matches!((seiten.next(), seiten.next(), seiten.next()), (Some(a), Some(b), None) if !a.is_empty() && !b.is_empty() && a.bytes().all(|c| c.is_ascii_digit()) && b.bytes().all(|c| c.is_ascii_digit()))
    }))
}

/// Stückpreis nach Staffel; rundet wie JavaScript `Math.round` (halbe Cent aufwärts).
fn staffel_preis(liste: i64, menge: i64, staffel: &str) -> i64 {
    let mut prozent = 0i64;
    if staffel != "0" {
        for teil in staffel.split('_') {
            let mut seiten = teil.split('x');
            let ab: i64 = seiten.next().and_then(|v| v.parse().ok()).unwrap_or(i64::MAX);
            let p: i64 = seiten.next().and_then(|v| v.parse().ok()).unwrap_or(0);
            if menge >= ab { prozent = p; }
        }
    }
    if prozent == 0 { liste } else { (liste * (100 - prozent) + 50).div_euclid(100) }
}

fn cents(betrag: &Value) -> Option<i64> {
    let zahl = match betrag { Value::String(s) => s.parse::<f64>().ok()?, Value::Number(n) => n.as_f64()?, _ => return None };
    if !zahl.is_finite() || zahl < 0.0 { return None; }
    Some((zahl * 100.0).round() as i64)
}

/// Tage seit 1970 aus "JJJJ-MM-TT" (für den Ablauf der Preisangabe).
fn sekunden(datum: &str) -> Option<i64> {
    let mut teile = datum.split('-').map(|t| t.parse::<i64>().ok());
    let (j, m, t) = (teile.next()??, teile.next()??, teile.next()??);
    let j2 = if m <= 2 { j - 1 } else { j };
    let aera = j2.div_euclid(400);
    let jahr_in_aera = j2 - aera * 400;
    let tag_im_jahr = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + t - 1;
    let tag_in_aera = jahr_in_aera * 365 + jahr_in_aera / 4 - jahr_in_aera / 100 + tag_im_jahr;
    Some((aera * 146097 + tag_in_aera - 719468) * 86400)
}

pub fn bewerten(zeile: &Zeile, schluessel: Option<&str>, jetzt: Option<i64>) -> Bewertung {
    let ware = zeile.merchandise.as_ref();
    let konfi_produkt = ware.and_then(|w| w.product.as_ref()).and_then(|p| p.konfi.as_ref()).and_then(|k| k.value.as_deref()).map_or(false, |v| !v.is_empty());
    let kennung = match zeile.gestaltung.as_ref().and_then(|g| g.value.as_deref()).filter(|v| !v.is_empty()) {
        Some(k) => k,
        None => return if konfi_produkt { Bewertung::Gesperrt("ohne_gestaltung") } else { Bewertung::Fremd },
    };
    let ware = match ware.filter(|w| w.art.as_deref() == Some("ProductVariant")) { Some(w) => w, None => return Bewertung::Gesperrt("keine_variante") };
    let schluessel = match schluessel.filter(|s| !s.is_empty()) { Some(s) => s, None => return Bewertung::Gesperrt("schluessel_fehlt") };
    let variante = ware.id.as_deref().unwrap_or("").rsplit('/').next().unwrap_or("");
    let wert = zeile.preis.as_ref().and_then(|p| p.value.as_deref()).unwrap_or("");
    let teile: Vec<&str> = wert.split('.').collect();
    if teile.len() != 5 || teile[0] != "v1" { return Bewertung::Gesperrt("format"); }
    let (aufpreis, ablauf) = match (teile[1].parse::<i64>(), teile[3].parse::<i64>()) { (Ok(a), Ok(b)) if a >= 0 && !teile[1].starts_with('+') => (a, b), _ => return Bewertung::Gesperrt("format") };
    if !staffel_gueltig(teile[2]) { return Bewertung::Gesperrt("format"); }
    let nachricht = format!("v1|{}|{}|{}|{}|{}", kennung, variante, aufpreis, teile[2], ablauf);
    let mut mac = match Hmac::<Sha256>::new_from_slice(schluessel.as_bytes()) { Ok(m) => m, Err(_) => return Bewertung::Gesperrt("schluessel_fehlt") };
    mac.update(nachricht.as_bytes());
    let erwartet = base64_url(&mac.finalize().into_bytes());
    // Vergleich ohne frühes Abbrechen
    let mut abweichung = erwartet.len() ^ teile[4].len();
    for (a, b) in erwartet.bytes().zip(teile[4].bytes().chain(std::iter::repeat(0))) { abweichung |= (a ^ b) as usize; }
    if abweichung != 0 { return Bewertung::Gesperrt("unterschrift"); }
    if let Some(jetzt) = jetzt { if jetzt > ablauf { return Bewertung::Gesperrt("abgelaufen"); } }
    let variante_cents = match zeile.cost.as_ref().and_then(|c| c.je_stueck.as_ref()).and_then(|b| cents(&b.amount)) { Some(c) => c, None => return Bewertung::Gesperrt("variantenpreis") };
    Bewertung::Ok { stueck: staffel_preis(variante_cents + aufpreis, zeile.quantity, teile[2]), variante: variante_cents }
}

fn rahmen(eingabe: &Eingabe) -> (Option<&str>, Option<i64>) {
    let shop = eingabe.shop.as_ref();
    (shop.and_then(|s| s.schluessel.as_ref()).and_then(|w| w.value.as_deref()),
     shop.and_then(|s| s.zeit.as_ref()).and_then(|z| z.date.as_deref()).and_then(sekunden))
}

pub fn preis_lauf(eingabe: &Eingabe) -> Value {
    let (schluessel, jetzt) = rahmen(eingabe);
    let mut operationen = Vec::new();
    for zeile in &eingabe.cart.lines {
        if let Bewertung::Ok { stueck, variante } = bewerten(zeile, schluessel, jetzt) {
            if stueck != variante {
                operationen.push(json!({"lineUpdate": {"cartLineId": zeile.id, "price": {"adjustment": {"fixedPricePerUnit": {"amount": format!("{}.{:02}", stueck / 100, stueck % 100)}}}}}));
            }
        }
    }
    json!({"operations": operationen})
}

pub fn pruef_lauf(eingabe: &Eingabe) -> Value {
    let schritt = eingabe.kaeufer.as_ref().and_then(|k| k.step.as_deref()).unwrap_or("");
    let mut fehler = Vec::new();
    if schritt == "CHECKOUT_INTERACTION" || schritt == "CHECKOUT_COMPLETION" {
        let (schluessel, jetzt) = rahmen(eingabe);
        for zeile in &eingabe.cart.lines {
            if let Bewertung::Gesperrt(grund) = bewerten(zeile, schluessel, jetzt) {
                let titel: String = zeile.merchandise.as_ref().and_then(|w| w.product.as_ref()).and_then(|p| p.title.as_deref()).unwrap_or("").chars().take(80).collect();
                let vorspann = if titel.is_empty() { String::new() } else { format!("„{}“: ", titel) };
                let text = if grund == "abgelaufen" {
                    "Diese Gestaltung ist zu alt. Bitte öffne sie im Warenkorb über „Bearbeiten“ und lege sie erneut in den Warenkorb."
                } else {
                    "Diese Position hat keine gültige Gestaltung. Bitte entferne sie und gestalte das Produkt im Konfigurator."
                };
                fehler.push(json!({"message": format!("{}{}", vorspann, text), "target": "$.cart"}));
            }
        }
    }
    json!({"operations": [{"validationAdd": {"errors": fehler}}]})
}

/// Gemeinsamer Rahmen der beiden Programme: JSON von der Standardeingabe, JSON auf die Standardausgabe.
pub fn laufen(funktion: fn(&Eingabe) -> Value) {
    let eingabe: Eingabe = serde_json::from_reader(std::io::stdin().lock()).expect("Eingabe ist kein gültiges JSON");
    serde_json::to_writer(std::io::stdout().lock(), &funktion(&eingabe)).expect("Ausgabe");
}
