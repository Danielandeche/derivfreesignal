/**
 * Scheduler - Manages all timing and notifications
 */

class Scheduler {
    constructor() {
        this.tasks = new Map();
        this.timers = [];
    }

    /**
     * Schedule a repeating task
     */
    scheduleRepeating(name, intervalMs, callback) {
        const timerId = setInterval(() => {
            try {
                callback();
            } catch (err) {
                console.error(`[Scheduler] Error in task "${name}":`, err.message);
            }
        }, intervalMs);

        this.timers.push(timerId);
        console.log(`[Scheduler] ✅ Recurring task scheduled: ${name} (every ${intervalMs / 1000}s)`);
    }

    /**
     * Schedule a one-time task
     */
    scheduleOnce(name, delayMs, callback) {
        const timerId = setTimeout(() => {
            try {
                callback();
            } catch (err) {
                console.error(`[Scheduler] Error in task "${name}":`, err.message);
            }
        }, delayMs);

        this.timers.push(timerId);
        console.log(`[Scheduler] ✅ One-time task scheduled: ${name} (in ${delayMs / 1000}s)`);
    }

    /**
     * Schedule relative to a base event
     * Example: scheduleRelative('expiry', 120000, 2000) = 2 seconds after each 120s cycle
     */
    scheduleRelative(name, cycleMs, offsetMs, callback) {
        const executeAtOffset = () => {
            // Calculate milliseconds until next cycle
            const now = Date.now();
            const cycle = Math.floor(now / cycleMs);
            const cycleStart = cycle * cycleMs;
            const nextCycleStart = cycleStart + cycleMs;
            const timeUntilNext = nextCycleStart - now;
            const delayToOffset = timeUntilNext + offsetMs;

            this.scheduleOnce(`${name}-instance`, delayToOffset, callback);
            // Re-schedule for next cycle
            executeAtOffset();
        };

        executeAtOffset();
        console.log(`[Scheduler] ✅ Relative task scheduled: ${name} (${offsetMs / 1000}s into each ${cycleMs / 1000}s cycle)`);
    }

    /**
     * Get all active timers count
     */
    getActiveTasksCount() {
        return this.timers.length;
    }

    /**
     * Clear all timers (cleanup)
     */
    clearAll() {
        this.timers.forEach(timerId => clearInterval(timerId) || clearTimeout(timerId));
        this.timers = [];
        console.log('[Scheduler] ✅ All tasks cleared');
    }
}

module.exports = Scheduler;
