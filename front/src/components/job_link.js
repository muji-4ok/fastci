import * as status from "../utils/status";
import {Link} from "react-router-dom";
import React from "react";
import {cancelJob, updateJob} from "../utils/action_api";
import ActionWithTooltip from "./action_with_tooltip";

export default function JobLink(props) {
    const {job} = props;
    const statusClass = status.getJobStatusClass(job);

    return (
        <div className='job_link'>
            <Link to={`/job/${job.id}`} className={statusClass}>
                <i className={`fas ${status.getIconClassFromStatusClass(statusClass)} fa_icon_fix_size`}/>
                <span>{job.name}</span>
            </Link>
            <div>
                <ActionWithTooltip onClick={updateJob.bind(null, job.id)}
                                   iconClass='fas fa-sync running' actionName='Update'/>
                <ActionWithTooltip onClick={cancelJob.bind(null, job.id)}
                                   iconClass='fas fa-ban cancelled' actionName='Cancel'/>
            </div>
        </div>
    );
}

