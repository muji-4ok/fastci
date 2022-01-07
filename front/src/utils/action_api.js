import * as api from "../utils/api";

export async function cancelJob(job_id) {
    if (await api.fetchDataFromApi(`fastci/api/cancel_job/${job_id}`) === null) {
        // TODO: Make a toast
        // TODO: Also make this throw an error
        console.log('Failed to cancel job!');
    }
}

export async function updateJob(job_id) {
    if (await api.fetchDataFromApi(`fastci/api/update_job/${job_id}`) === null) {
        // TODO: Make a toast
        // TODO: Also make this throw an error
        console.log('Failed to update job!');
    }
}

export async function cancelPipeline(pipeline_id) {
    if (await api.fetchDataFromApi(`fastci/api/cancel_pipeline/${pipeline_id}`) === null) {
        // TODO: Make a toast
        // TODO: Also make this throw an error
        console.log('Failed to cancel pipeline!');
    }
}

export async function updatePipeline(pipeline_id) {
    if (await api.fetchDataFromApi(`fastci/api/update_pipeline/${pipeline_id}`) === null) {
        // TODO: Make a toast
        // TODO: Also make this throw an error
        console.log('Failed to update pipeline!');
    }
}
