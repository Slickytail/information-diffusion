class Timer {
    constructor(timing) {
        this.timing = timing || 1000;
        this.isPaused = false;
    }

    set paused(val) {
        // pause and cancel the next tick
        if (val)
            clearTimeout(this.timeout);
        // resume
        else if (this.isPaused) {
            this.isPaused = val;
            this._queue_tick();
        }
        this.isPaused = val;
    }

    get paused() {
        return this.isPaused;
    }

    start() {
        this._queue_tick();
    }

    _queue_tick() {
        if (!this.isPaused) {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                if (this._ontick)
                    this._ontick();
                this._queue_tick();
            }, this.timing);
        }
    }

    set ontick(handler) {
        // We might have a timeout set on the old handler, so let's clear that
        clearTimeout(this.timeout);
        this._ontick = handler;
        // Now queue up a new tick
        this._queue_tick()
    }

}
