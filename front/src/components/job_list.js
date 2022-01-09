import React from "react";
import * as api from "../utils/api";
import * as status from "../utils/status";
import {Link} from "react-router-dom";
import ActionWithTooltip from "./action_with_tooltip";
import {cancelJob, updateJob} from "../utils/action_api";
import RequiresLogin from "./requires_login";
import {setupWebsocketScheduler} from "../utils/api";

export default function JobListPage() {
    let [data, setData] = React.useState([]);

    async function refreshList() {
        const data = await api.fetchDataFromGetApi('fastci/api/job_list');

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh job list!');
            return;
        }

        setData(data);
    }

    React.useEffect(() => {
        return setupWebsocketScheduler(refreshList);
    }, []);

    function makeJobElement(job, index) {
        const statusDescription = status.JOB_STATUS_DESCRIPTION[job.status];
        const statusClass = status.getJobStatusClass(job);

        // TODO: make the buttons pretty
        return (
            <tr key={index}>
                <td>
                    <Link to={`/job/${job.id}`}>{job.id}</Link>
                </td>
                <td>
                    <Link to={`/job/${job.id}`}>{job.name}</Link>
                </td>
                <td>
                    <Link to={`/pipeline/${job.pipeline.id}`}>{job.pipeline.id}</Link>
                </td>
                <td>
                    <Link to={`/pipeline/${job.pipeline.id}`}>{job.pipeline.name}</Link>
                </td>
                <td className={statusClass}>{statusDescription}</td>
                {/* TODO: do we need to slice the id? */}
                <td>{job.container_id.slice(0, 12)}</td>
                <td>{job.uptime_secs.toFixed(2)}</td>
                <td>
                    <ActionWithTooltip
                        onClick={async (event) => {
                            await updateJob(job.id);
                            await refreshList();
                        }}
                        iconClass='fas fa-sync running'
                        actionName='Update'/>
                    <ActionWithTooltip
                        onClick={async (event) => {
                            await cancelJob(job.id);
                            await refreshList();
                        }} iconClass='fas fa-ban cancelled'
                        actionName='Cancel'/>
                </td>
            </tr>
        );
    }

    // TODO: paging
    // TODO: search
    // TODO: start, restart
    const elements = data.slice().reverse().map(makeJobElement);

    // maybe remove container id?
    return (
        <RequiresLogin>
            <table className='simple_table'>
                <thead>
                <tr>
                    <th>Id</th>
                    <th>Name</th>
                    <th>Pipeline id</th>
                    <th>Pipeline name</th>
                    <th>Status</th>
                    <th>Container id</th>
                    <th>Uptime (in secs)</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {elements}
                </tbody>
            </table>
        </RequiresLogin>
    );
}
