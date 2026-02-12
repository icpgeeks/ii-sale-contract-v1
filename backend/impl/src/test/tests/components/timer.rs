use std::time::Duration;

use common_canister_impl::components::timer::Timer;
use ic_cdk_timers::TimerId;

pub struct TimerTest;

impl Timer for TimerTest {
    fn clear_timer(&self, _timer_id: TimerId) {}

    fn set_timer(&self, _delay: Duration, _func: Box<dyn Fn()>) -> Option<TimerId> {
        None
    }
}
