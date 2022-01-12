import React from "react";
import * as api from "../utils/api";
import {useWebsocketScheduler} from "../utils/api";
import * as status from "../utils/status";
import {Link} from "react-router-dom";
import ActionWithTooltip from "./action_with_tooltip";
import {cancelJob, updateJob} from "../utils/action_api";
import RequiresLogin from "./requires_login";
import {ListPaginator, PAGE_SIZE} from "./list_paginator";

export default function JobListPage() {
    let [data, setData] = React.useState([]);
    let [page, setPage] = React.useState(1);
    let [pageCount, setPageCount] = React.useState(1);

    const refreshList = React.useCallback(async () => {
        const response = await api.fetchDataFromGetApi(`fastci/api/job_list?page=${page}`);

        if (response === null) {
            // TODO: Make a toast
            console.log('Failed to refresh job list!');
            return;
        }

        const data = response['results'];
        setData(data);
        setPageCount(Math.ceil(response['count'] / PAGE_SIZE));
    }, [page]);

    useWebsocketScheduler(refreshList);

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
                <td>{job.container_id ? job.container_id.slice(0, 12) : 'Cleaned up'}</td>
                <td>{job.uptime_secs.toFixed(2)}</td>
                <td>
                    <ActionWithTooltip
                        onClick={updateJob.bind(null, job.id)}
                        iconClass='fas fa-sync running'
                        actionName='Update'/>
                    <ActionWithTooltip
                        onClick={cancelJob.bind(null, job.id)}
                        iconClass='fas fa-ban cancelled'
                        actionName='Cancel'/>
                </td>
            </tr>
        );
    }

    // TODO: search
    // TODO: start, restart
    const elements = data.map(makeJobElement);

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
            <ListPaginator page={page} setPage={setPage} pageCount={pageCount}/>
        </RequiresLogin>
    );
}
