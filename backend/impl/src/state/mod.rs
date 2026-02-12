use crate::components::Environment;
use crate::model::ContractModel;
use std::rc::Rc;

pub struct CanisterState {
    env: Rc<Environment>,
    model: ContractModel,
}

impl CanisterState {
    pub(crate) fn new(env: Environment, model: ContractModel) -> Self {
        let env = Rc::new(env);
        Self { env, model }
    }

    pub(crate) fn get_env(&self) -> Rc<Environment> {
        Rc::clone(&self.env)
    }

    pub(crate) fn get_model(&self) -> &ContractModel {
        &self.model
    }

    pub(crate) fn get_model_mut(&mut self) -> &mut ContractModel {
        &mut self.model
    }
}
