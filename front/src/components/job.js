import React from "react";
import * as api from "../utils/api";
import {Link, useParams} from "react-router-dom";
import * as status from "../utils/status";
import RequiresLogin from "./requires_login";

function makeBasicInfoElement(name, value) {
    return (
        <div key={name}>
            <label>{name}</label>
            <label>{value}</label>
        </div>
    );
}

function makeLinkInfoElement(name, value, link) {
    return (
        <div key={name}>
            <label>{name}</label>
            <label>
                {/* TODO: show name of pipeline */}
                <Link to={link}>{value}</Link>
            </label>
        </div>
    );
}

function makeStatusElement(job) {
    return (
        <div key='Status'>
            <label>Status</label>
            <label className={status.getJobStatusClass(job)}>
                {status.JOB_STATUS_DESCRIPTION[job.status]}
            </label>
        </div>
    );
}

export default function JobPage() {
    // TODO: line numbers
    const params = useParams();
    const id = params.job_id;

    let [jobData, setJobData] = React.useState({
            id: id,
            name: '',
            pipeline: 0,
            container_id: '',
            timeout_secs: null,
            uptime_secs: 0,
            // remove parents?
            parents: [],
            status: 0,
            error: '',
            exit_code: null,
            output: ''
        }
    );

    React.useEffect(() => {
        async function refreshJob() {
            const data = await api.fetchDataFromApi(`fastci/api/job/${id}`);

            if (data === null) {
                // TODO: Make a toast
                console.log('Failed to refresh job!');
                return;
            }

            setJobData(data);
        }

        let intervalId = setInterval(refreshJob, 1000);
        // Ignoring for now
        refreshJob();

        return () => clearInterval(intervalId);
    }, [id]);

    let info_elements = [
        makeBasicInfoElement('Id', id),
        makeBasicInfoElement('Name', jobData.name),
        makeLinkInfoElement('Pipeline id', jobData.pipeline.id,
            `/pipeline/${jobData.pipeline.id}`),
        makeLinkInfoElement('Pipeline name', jobData.pipeline.name,
            `/pipeline/${jobData.pipeline.id}`),
        // TODO: do we need to slice the id?
        makeBasicInfoElement('Container id', jobData.container_id.slice(0, 12)),
        makeBasicInfoElement('Timeout (in secs)',
            jobData.timeout_secs?.toFixed(2) ?? 'None'),
        makeBasicInfoElement('Uptime (in secs)', jobData.uptime_secs.toFixed(2)),
        makeStatusElement(jobData),
        makeBasicInfoElement('Error', jobData.error || 'None'),
        makeBasicInfoElement('Exit code', jobData.exit_code ?? 'None')
    ];

    return (
        <RequiresLogin>
            <div className='job_page_container'>
                <p className='console_output'>{jobData.output}</p>
                <div className='job_info_pane'>
                    {info_elements}
                </div>
            </div>
        </RequiresLogin>
    );
}
