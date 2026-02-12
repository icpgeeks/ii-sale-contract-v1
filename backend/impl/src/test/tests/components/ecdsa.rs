use async_trait::async_trait;
use common_canister_impl::components::ecdsa::interface::EcdsaSignature;
use common_canister_types::{DerivationPath, EcdsaKeyCompact, EcdsaSignatureCompact, MessageHash};
use ic_cdk::management_canister::{EcdsaCurve, EcdsaKeyId};

pub const PUBLIC_KEY: [u8; 33] = [
    2, 249, 40, 81, 17, 40, 116, 210, 100, 99, 161, 128, 252, 96, 117, 88, 150, 166, 52, 93, 10,
    184, 30, 95, 170, 228, 245, 134, 182, 39, 124, 28, 82,
];

pub struct EcdsaTest {}

#[async_trait]
impl EcdsaSignature for EcdsaTest {
    fn get_ecdsa_key_id(&self) -> EcdsaKeyId {
        EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: "test_fake_key".to_owned(),
        }
    }

    async fn get_ecdsa_key(
        &self,
        _derivation_path: DerivationPath,
    ) -> Result<EcdsaKeyCompact, String> {
        Ok(PUBLIC_KEY.to_vec())
    }

    async fn sign_with_ecdsa(
        &self,
        _derivation_path: DerivationPath,
        _message_hash: &MessageHash,
    ) -> Result<EcdsaSignatureCompact, String> {
        Ok(vec![1])
    }
}
