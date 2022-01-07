const JOB_NOT_STARTED = 0;
const JOB_RUNNING = 1;
const JOB_TIMED_OUT = 2;
const JOB_DOCKER_ERROR = 3;
const JOB_NOT_FOUND = 4;
const JOB_FINISHED = 5;
const JOB_FAILED_TO_START = 6;
const JOB_CANCELLED = 7;
const JOB_DEPENDENCY_FAILED = 8;

export const JOB_STATUS_DESCRIPTION = [
    'Not started',
    'Running',
    'Timed out',
    'Docker error',
    'Not found',
    'Finished',
    'Failed to start',
    'Cancelled',
    'Dependency failed'
];

const PIPELINE_NOT_STARTED = 0;
const PIPELINE_RUNNING = 1;
const PIPELINE_FAILED = 2;
const PIPELINE_FINISHED = 3;
const PIPELINE_CANCELLED = 4;

export const PIPELINE_STATUS_DESCRIPTION = [
    'Not started',
    'Running',
    'Failed',
    'Finished',
    'Cancelled',
];

export function getJobStatusClass(job) {
    if (job.status === JOB_NOT_STARTED) {
        return 'not_started';
    } else if (job.status === JOB_RUNNING) {
        return 'running';
    } else if (job.status === JOB_DOCKER_ERROR || job.status === JOB_FAILED_TO_START
        || job.status === JOB_NOT_FOUND
        || job.status === JOB_TIMED_OUT
        || (job.status === JOB_FINISHED && job.exit_code !== 0)) {
        return 'failed';
    } else if (job.status === JOB_FINISHED) {
        return 'succeded';
    } else {
        return 'cancelled';
    }
}

export function getIconClassFromStatusClass(statusClass) {
    if (statusClass === 'not_started') {
        return 'fa-stopwatch';
    } else if (statusClass === 'running') {
        return 'fa-clock';
    } else if (statusClass === 'failed') {
        return 'fa-times';
    } else if (statusClass === 'succeded') {
        return 'fa-check';
    } else {
        return 'fa-ban';
    }
}

export function getPipelineStatusClass(status) {
    if (status === PIPELINE_NOT_STARTED) {
        return 'not_started';
    } else if (status === PIPELINE_RUNNING) {
        return 'running';
    } else if (status === PIPELINE_FAILED) {
        return 'failed';
    } else if (status === PIPELINE_FINISHED) {
        return 'succeded';
    } else {
        return 'cancelled';
    }
}

export function getStageStatusClass(stage) {
    // stage = list of jobs
    let anyFailed = false;
    let anyCancelled = false;
    let anyNotStarted = false;

    for (const job of stage) {
        const jobStatusClass = getJobStatusClass(job);

        if (jobStatusClass === 'running') {
            return 'running';
        } else if (jobStatusClass === 'failed') {
            anyFailed = true;
        } else if (jobStatusClass === 'cancelled') {
            anyCancelled = true;
        } else if (jobStatusClass === 'not_started') {
            anyNotStarted = true;
        }
    }

    if (anyNotStarted) {
        return 'not_started';
    }

    if (anyCancelled) {
        return 'cancelled';
    }

    if (anyFailed) {
        return 'failed';
    }

    return 'succeded';
}

