import React from "react";
import * as api from "../utils/api";
import {Link} from "react-router-dom";
import * as status from "../utils/status";
import {withRouter} from '../utils/route'
import RequiresLogin from "./requires_login";

export default class JobPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: this.props.params.job_id,
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
        };
    }

    static intervalId = null;

    async refreshJob() {
        const data = await api.fetchDataFromApi(`fastci/api/job/${this.state.id}`);

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh job!');
            return;
        }

        this.setState({...data});
    }

    async componentDidMount() {
        // NOTE: See the NOTE: in PipelineListPage
        this.intervalId = setInterval(async () => await this.refreshJob(), 1000);
        await this.refreshJob()
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    makeBasicInfoElement(name, value) {
        return (
            <div key={name}>
                <label>{name}</label>
                <label>{value}</label>
            </div>
        );
    }

    makeLinkInfoElement(name, value, link) {
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

    makeStatusElement(job) {
        return (
            <div key='Status'>
                <label>Status</label>
                <label className={status.getJobStatusClass(job)}>
                    {status.JOB_STATUS_DESCRIPTION[job.status]}
                </label>
            </div>
        );
    }

    render() {
        // TODO: line numbers

        let info_elements = [
                this.makeBasicInfoElement('Id', this.state.id),
                this.makeBasicInfoElement('Name', this.state.name),
                this.makeLinkInfoElement('Pipeline id', this.state.pipeline.id,
                    `/pipeline/${this.state.pipeline.id}`),
                this.makeLinkInfoElement('Pipeline name', this.state.pipeline.name,
                    `/pipeline/${this.state.pipeline.id}`),
                // TODO: do we need to slice the id?
                this.makeBasicInfoElement('Container id', this.state.container_id.slice(0, 12)),
                this.makeBasicInfoElement('Timeout (in secs)',
                    this.state.timeout_secs?.toFixed(2) ?? 'None'),
                this.makeBasicInfoElement('Uptime (in secs)', this.state.uptime_secs.toFixed(2)),
                this.makeStatusElement(this.state),
                this.makeBasicInfoElement('Error', this.state.error || 'None'),
                this.makeBasicInfoElement('Exit code', this.state.exit_code ?? 'None')
            ]
        ;

        return (
            <RequiresLogin>
                <div className='job_page_container'>
                    <p className='console_output'>{this.state.output}</p>
                    <div className='job_info_pane'>
                        {info_elements}
                    </div>
                </div>
            </RequiresLogin>
        );
    }
}

JobPage = withRouter(JobPage);
