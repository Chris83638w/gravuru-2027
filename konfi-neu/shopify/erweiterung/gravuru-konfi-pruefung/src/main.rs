//! Kassenprüfung des gravuru-Konfigurators (Shopify Cart and Checkout Validation).
//! Sperrt an der Kasse nur Zeilen ohne gültige Gestaltung; im Warenkorb wird nie gesperrt, damit der Kunde
//! eine solche Zeile immer entfernen oder neu gestalten kann. Regeln: `shopify/funktion/logik.mjs`.
use gravuru_konfi_funktion::{bewerten_roh, datum_sekunden, sperr_text, Bewertung, ZeileRoh};
use shopify_function::prelude::*;
use shopify_function::Result;
use std::process;

#[typegen("./schema.graphql")]
pub mod schema {
    #[query("./src/cart_validations_generate_run.graphql")]
    pub mod cart_validations_generate_run {}
}

fn main() {
    log!("Bitte einen benannten Export aufrufen.");
    process::abort();
}

#[shopify_function]
fn cart_validations_generate_run(input: schema::cart_validations_generate_run::Input) -> Result<schema::CartValidationsGenerateRunResult> {
    use schema::cart_validations_generate_run::input::cart::lines::Merchandise;
    let mut errors = Vec::new();
    let an_der_kasse = matches!(input.buyer_journey().step(), Some(schema::BuyerJourneyStep::CheckoutInteraction) | Some(schema::BuyerJourneyStep::CheckoutCompletion));
    if an_der_kasse {
        let schluessel = input.shop().schluessel().map(|m| m.value().as_str());
        let jetzt = datum_sekunden(input.shop().local_time().date());
        for line in input.cart().lines() {
            let (ist_variante, gid, konfi, titel) = match line.merchandise() {
                Merchandise::ProductVariant(v) => (true, v.id().as_str(), v.product().konfi().map_or(false, |m| !m.value().is_empty()), v.product().title().as_str()),
                _ => (false, "", false, ""),
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
            // Die Währung ändert nichts daran, ob eine Zeile gültig ist.
            if let Bewertung::Gesperrt(grund) = bewerten_roh(&zeile, schluessel, jetzt, 1.0) {
                errors.push(schema::ValidationError { message: sperr_text(titel, grund), target: "$.cart".to_string() });
            }
        }
    }
    Ok(schema::CartValidationsGenerateRunResult { operations: vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation { errors })] })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::run_function_with_input;

    /// Vergleicht die Erweiterung mit der JavaScript-Referenz über 150 zufällige Warenkörbe.
    #[test]
    fn sperrt_wie_die_referenz() {
        let faelle: serde_json::Value = serde_json::from_str(include_str!("../../fixtures/pruefung.json")).unwrap();
        let mut gesperrt = 0;
        for (nummer, fall) in faelle.as_array().unwrap().iter().enumerate() {
            let ergebnis = run_function_with_input(cart_validations_generate_run, &fall["eingabe"].to_string()).unwrap();
            let ist: Vec<String> = match &ergebnis.operations[0] { schema::Operation::ValidationAdd(v) => v.errors.iter().map(|e| e.message.clone()).collect() };
            let soll: Vec<String> = fall["erwartet"].as_array().unwrap().iter().map(|e| e.as_str().unwrap().to_string()).collect();
            assert_eq!(ist, soll, "Warenkorb {}", nummer);
            gesperrt += soll.len();
        }
        assert!(gesperrt > 300, "zu wenige Sperren geprüft: {}", gesperrt);
    }
}
