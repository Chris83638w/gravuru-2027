//! Preisfunktion des gravuru-Konfigurators (Shopify Cart Transform).
//! Die Regeln stehen in `shopify/funktion/logik.mjs`; gerechnet wird im gemeinsamen Kern `gravuru-konfi-funktion`.
use gravuru_konfi_funktion::{betrag, bewerten_roh, datum_sekunden, Bewertung, ZeileRoh};
use shopify_function::prelude::*;
use shopify_function::Result;
use std::process;

#[typegen("./schema.graphql")]
pub mod schema {
    #[query("./src/cart_transform_run.graphql")]
    pub mod cart_transform_run {}
}

fn main() {
    log!("Bitte einen benannten Export aufrufen.");
    process::abort();
}

#[shopify_function]
fn cart_transform_run(input: schema::cart_transform_run::Input) -> Result<schema::CartTransformRunResult> {
    use schema::cart_transform_run::input::cart::lines::Merchandise;
    let schluessel = input.shop().schluessel().map(|m| m.value().as_str());
    let jetzt = datum_sekunden(input.shop().local_time().date());
    let kurs = input.presentment_currency_rate().0;
    let mut operations = Vec::new();
    for line in input.cart().lines() {
        let (ist_variante, gid, konfi) = match line.merchandise() {
            Merchandise::ProductVariant(v) => (true, v.id().as_str(), v.product().konfi().map_or(false, |m| !m.value().is_empty())),
            _ => (false, "", false),
        };
        let zeile = ZeileRoh {
            kennung: line.gestaltung().and_then(|a| a.value().map(|s| s.as_str())),
            konfi_produkt: konfi,
            ist_variante,
            varianten_gid: gid,
            preisangabe: line.preis().and_then(|a| a.value().map(|s| s.as_str())).unwrap_or(""),
            varianten_cents: Some((line.cost().amount_per_quantity().amount().0 * 100.0).round() as i64),
            menge: *line.quantity() as i64,
        };
        if let Bewertung::Ok { stueck, variante } = bewerten_roh(&zeile, schluessel, jetzt, kurs) {
            if stueck != variante {
                operations.push(schema::Operation::LineUpdate(schema::LineUpdateOperation {
                    cart_line_id: line.id().clone(),
                    title: None,
                    image: None,
                    price: Some(schema::LineUpdateOperationPriceAdjustment {
                        adjustment: schema::LineUpdateOperationPriceAdjustmentValue::FixedPricePerUnit(schema::LineUpdateOperationFixedPricePerUnitAdjustment { amount: Decimal(betrag(stueck).parse().unwrap_or(0.0)) }),
                    }),
                }));
            }
        }
    }
    Ok(schema::CartTransformRunResult { operations })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::run_function_with_input;

    /// Vergleicht die Erweiterung mit der JavaScript-Referenz über 150 zufällige Warenkörbe
    /// (erzeugt mit `node shopify/erweiterung/fixtures-erzeugen.mjs`).
    #[test]
    fn rechnet_wie_die_referenz() {
        let faelle: serde_json::Value = serde_json::from_str(include_str!("../../fixtures/preis.json")).unwrap();
        let mut geprueft = 0;
        for (nummer, fall) in faelle.as_array().unwrap().iter().enumerate() {
            let ergebnis = run_function_with_input(cart_transform_run, &fall["eingabe"].to_string()).unwrap();
            let ist: Vec<(String, String)> = ergebnis.operations.iter().map(|op| match op {
                schema::Operation::LineUpdate(u) => match &u.price.as_ref().unwrap().adjustment {
                    schema::LineUpdateOperationPriceAdjustmentValue::FixedPricePerUnit(f) => (u.cart_line_id.clone(), betrag((f.amount.0 * 100.0).round() as i64)),
                },
                _ => panic!("unerwartete Operation"),
            }).collect();
            let soll: Vec<(String, String)> = fall["erwartet"].as_array().unwrap().iter().map(|e| (e["id"].as_str().unwrap().to_string(), e["amount"].as_str().unwrap().to_string())).collect();
            assert_eq!(ist, soll, "Warenkorb {}", nummer);
            geprueft += soll.len();
        }
        assert!(geprueft > 100, "zu wenige Preisänderungen geprüft: {}", geprueft);
    }
}
