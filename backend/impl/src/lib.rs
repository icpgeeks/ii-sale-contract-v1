mod components;
mod guards;
mod handlers;
mod lifecycle;
mod model;
mod queries;
mod state;
mod test;
mod updates;

common_canister_impl::canister_state!(state::CanisterState);

fn get_env() -> std::rc::Rc<components::Environment> {
    read_state(|s| s.get_env())
}
