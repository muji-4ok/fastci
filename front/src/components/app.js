import React from 'react';
import {
    BrowserRouter,
    Link,
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useParams
} from 'react-router-dom';
import {topologicalSort, transformToChildrenGraph, transformToJobsDict} from '../utils/node'

const JOB_NOT_STARTED = 0;
const JOB_RUNNING = 1;
const JOB_TIMED_OUT = 2;
const JOB_DOCKER_ERROR = 3;
const JOB_NOT_FOUND = 4;
const JOB_FINISHED = 5;
const JOB_FAILED_TO_START = 6;
const JOB_CANCELLED = 7;
const JOB_DEPENDENCY_FAILED = 8;

const JOB_STATUS_DESCRIPTION = [
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

const PIPELINE_STATUS_DESCRIPTION = [
    'Not started',
    'Running',
    'Failed',
    'Finished',
    'Cancelled',
];

const API_BASE = 'http://localhost:8000'


function Header() {
    let location = useLocation();

    return (
        <div className='menu'>
            <Link to='/'>Main page</Link>
            <Link to='/pipeline_list'>Pipeline list</Link>
            <Link to='/job_list'>Job list</Link>
            <Link to='/signout' state={{from: location}}>Sign out</Link>
        </div>
    );
}

async function loginViaJWT(username, password) {
    // The / at the end is needed for django for some reason
    const url = `${API_BASE}/api/token/`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'Application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await response.json();

    if (response.status === 401) {
        return data['detail'];
    } else {
        window.localStorage.setItem('ACCESS_TOKEN', data['access']);
        window.localStorage.setItem('REFRESH_TOKEN', data['refresh']);
        return '';
    }
}

async function refreshAccessToken() {
    // The / at the end is needed for django for some reason
    const url = `${API_BASE}/api/token/refresh/`
    const refreshToken = window.localStorage.getItem('REFRESH_TOKEN') || '';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'Application/json',
        },
        body: JSON.stringify({
            refresh: refreshToken
        })
    });

    const data = await response.json();

    if (response.status === 401) {
        console.log('Refreshing token failed with unauthorized error:', data['detail']);
        return false;
    } else if (response.status !== 200) {
        console.log('Refreshing token failed with error:', data);
        return false;
    } else {
        window.localStorage.setItem('ACCESS_TOKEN', data['access']);
        return true;
    }
}

async function signUp(firstName, lastName, username, email, password) {
    // The / at the end is needed for django for some reason
    const url = `${API_BASE}/fastci/api/create_user/`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'Application/json'
        },
        body: JSON.stringify({
            username: username,
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        })
    });

    const data = await response.json();

    if (response.status === 201) {
        await loginViaJWT(username, password);
        return '';
    } else {
        // TODO: handle unexpected data
        return Object.keys(data).map(
            (name, i) => name + ': ' + data[name].join(' ')
        ).join('\n');
    }
}

function signOut() {
    window.localStorage.removeItem('ACCESS_TOKEN');
    window.localStorage.removeItem('REFRESH_TOKEN');
}

function isLoggedIn() {
    if (!window.localStorage.getItem('REFRESH_TOKEN')) {
        return false;
    }

    // TODO: Check that token is actually valid. Or don't check? This is called on every page,
    //       render. And I don't think we wan't to make an API call **every** time.

    return true;
}

async function doCallApi(path) {
    // low level call - returns the response, doesn't try to refresh the token, just passes the
    // stored access token
    const url = `${API_BASE}/${path}`;
    const accessToken = window.localStorage.getItem('ACCESS_TOKEN') || '';
    const headers = {
        Authorization: `Bearer ${accessToken}`
    };
    return await fetch(url, {headers});
}

async function fetchDataFromApi(path) {
    let response = await doCallApi(path);

    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            return null;
        } else {
            response = await doCallApi(path);

            // It may so happen that the token is valid and refreshes with no problems, but the user
            // linked to this token no longer exists. And so the backend will reject our attempt
            // only at this point.
            if (response.status === 401) {
                return null;
            }
        }
    }

    return await response.json();
}

function RequiresLogin(props) {
    let {children} = props;
    let location = useLocation();

    if (isLoggedIn()) {
        return children;
    } else {
        return <Navigate to='/login' state={{from: location}}/>
    }
}

function LoginPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [username, setUsername] = React.useState('');
    let [password, setPassword] = React.useState('');
    let initialMessage = (from === null || from.pathname === '/login') ? '\u200b'
        : 'You need to login to view this page!';
    let [error, setError] = React.useState(initialMessage);

    const handle_submit = async (event) => {
        event.preventDefault();

        if (!username) {
            setError('You need to specify the username!');
            return;
        }

        if (!password) {
            setError('You need to specify the password!');
            return;
        }

        const message = await loginViaJWT(username, password);

        if (message === '') {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            setError(message);
        }
    };

    return (
        <div className='submit_form'>
            <p>FastCI</p>
            <form onSubmit={handle_submit}>
                <div>
                    <label>Username:</label>
                    <input
                        type='text'
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type='password'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>
                <span>{error}</span>
                <button type='submit'>Login</button>
            </form>
            <Link to='/register' state={(from === null) ? null : {from: from}}>Register</Link>
        </div>
    );
}

function RegisterPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [firstName, setFirstName] = React.useState('');
    let [lastName, setLastName] = React.useState('');
    let [username, setUsername] = React.useState('');
    let [email, setEmail] = React.useState('');
    let [password, setPassword] = React.useState('');
    let [confirmPassword, setConfirmPassword] = React.useState('');
    let [error, setError] = React.useState('\u200b');

    const handle_submit = async (event) => {
        event.preventDefault();

        // not sure if all this validation is needed

        if (!firstName) {
            setError('You need to specify the first name!');
            return;
        }

        // TODO: maybe make optional
        if (!lastName) {
            setError('You need to specify the last name!');
            return;
        }

        if (!username) {
            setError('You need to specify the username!');
            return;
        }

        if (!email) {
            setError('You need to specify the email!');
            return;
        }

        if (!password) {
            setError('You need to specify the password!');
            return;
        }

        if (!confirmPassword) {
            setError('You need to type your password again!');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords don\'t match!');
            return;
        }

        const apiResultMessage = await signUp(firstName, lastName, username, email, password);

        if (apiResultMessage === '') {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            setError(apiResultMessage);
        }
    };

    return (
        <div className='submit_form'>
            <p>FastCI register</p>
            <form onSubmit={handle_submit}>
                <div>
                    <label>First name:</label>
                    <input
                        type='text'
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                    />
                </div>
                <div>
                    <label>Last name:</label>
                    <input
                        type='text'
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                    />
                </div>
                <div>
                    <label>Username:</label>
                    <input
                        type='text'
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        type='text'
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type='password'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>
                <div>
                    <label>Confirm password:</label>
                    <input
                        type='password'
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                </div>
                <span>{error}</span>
                <button type='submit'>Register</button>
            </form>
            <Link to='/login' state={(from === null) ? null : {from: from}}>Login</Link>
        </div>
    );
}

function SignOutPage() {
    const from = useLocation().state?.from || null;
    signOut();
    return <Navigate to='/login' state={(from === null) ? null : {from: from}}/>
}

function MainPage() {
    return (
        <RequiresLogin>
            <div>
                <p>Main page (WIP)</p>
                <p>There should be some statistics or something idk</p>
            </div>
        </RequiresLogin>
    );
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class PipelineListPage extends React.Component {
    constructor(props) {
        super(props);
        // TODO: @Speed - redrawing **everything** on each button click is surely really
        //       inefficient
        //       also kinda ugly
        this.state = {
            data: [],
            pipelineIdDropdownOpen: null,
            stageIndexDropdownOpen: null
        };
    }

    static intervalId = null;

    async refreshList() {
        let data = await fetchDataFromApi('fastci/api/pipeline_list');

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline list!');
            return;
        }

        // @Speed - copying this each time just doesn't feel right
        let dataWithJobsTransformed = data.map((pipeline, i) => transformToJobsDict(pipeline));
        this.setState({data: dataWithJobsTransformed});
    }

    async componentDidMount() {
        // NOTE: componentDidMount and componentWillUnmount are, strangely enough, executed
        //       concurrently. And we need setInterval to fire before clearInterval. But js doesn't
        //       have any locks, which is strange... So we need to rely on the fact that js is run
        //       in a single thread, that componentDidMount is scheduled before compontWillUnmount,
        //       js has cooperative concurrency (NOT SURE ABOUT THIS ONE) and that setInterval and
        //       such don't cause context switching. Another thing is that react is fucking
        //       retarted, no other way of saying it. State changes in componentDidMount are not
        //       visible in componentWillUnmount for some stupid fucking reason... Thus we need to
        //       use different storage for the interval id - static variables for example, because I
        //       don't give a shit and fuck js. Taking all of this into consideration, we can
        //       conclude that this code below is (hopefully) correct
        this.intervalId = setInterval(async () => await this.refreshList(), 1000);
        await this.refreshList()
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    // `bind` prepends any additional arguments, so these identification args must precede `event`
    toggleDropdown(pipelineId, stageIndex, event) {
        // TODO: might be useful if I add hideDropdown, which isn't used yet
        // event.stopPropagation();

        // TODO: is this needed?
        event.preventDefault();

        if (this.state.pipelineIdDropdownOpen === pipelineId &&
            this.state.stageIndexDropdownOpen === stageIndex) {
            this.setState({
                pipelineIdDropdownOpen: null,
                stageIndexDropdownOpen: null
            });
        } else {
            this.setState({
                pipelineIdDropdownOpen: pipelineId,
                stageIndexDropdownOpen: stageIndex
            });
        }
    }

    // TODO: Not sure how to use this yet. I can place this in the top-level container, but then
    //       I'll need to carefully handle event propagation
    hideDropdown(event) {
        // TODO: is this needed?
        event.preventDefault();

        this.setState({
            pipelineIdDropdownOpen: null,
            stageIndexDropdownOpen: null
        });
    }

    makePipelineElement(pipeline, index) {
        const status = PIPELINE_STATUS_DESCRIPTION[pipeline.status];
        const statusClass = getPipelineStatusClass(pipeline.status);

        // @Speed - inefficient - copying and recalculating this here
        const stages = topologicalSort(transformToChildrenGraph(pipeline.jobs));
        const stagesElements = stages.map((stage, i) => {
            const jobsElements = stage.map((job, i) => {
                return <Link to={`/job/${job.id}`} key={i}>{job.name}</Link>;
            });

            return (
                <div className="pipeline_list_dropdown_container" key={i}>
                    <button onClick={this.toggleDropdown.bind(this, pipeline.id, i)}>
                        {`stage_${i}`}
                    </button>
                    {(this.state.pipelineIdDropdownOpen === pipeline.id &&
                        this.state.stageIndexDropdownOpen === i) ?
                        <div>{jobsElements}</div> : null}
                </div>
            );
        });

        return (
            <tr key={index}>
                <td>
                    <Link to={`/pipeline/${pipeline.id}`}>{pipeline.id}</Link>
                </td>
                <td>
                    <Link to={`/pipeline/${pipeline.id}`}>{pipeline.name}</Link>
                </td>
                <td className={statusClass}>{status}</td>
                <td>
                    <div className="pipeline_list_stages_box">
                        {stagesElements}
                    </div>
                </td>
            </tr>
        );
    }

    render() {
        // TODO:
        //   1. paging
        //   2. search
        //   3. actions - update, cancel, start, restart
        //   4. uptime
        //   5. show status of individual stages and also steps in each stage
        const elements = this.state.data.reverse().map(this.makePipelineElement.bind(this));

        return (
            <RequiresLogin>
                <table className="simple_table">
                    <thead>
                    <tr>
                        <th>Id</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Jobs</th>
                    </tr>
                    </thead>
                    <tbody>
                    {elements}
                    </tbody>
                </table>
            </RequiresLogin>
        );
    }
}

function getJobStatusClass(job) {
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

class JobListPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {data: []};
    }

    static intervalId = null;

    async refreshList() {
        const data = await fetchDataFromApi('fastci/api/job_list');

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh job list!');
            return;
        }

        this.setState({data: data});
    }

    async componentDidMount() {
        // NOTE: See the NOTE: in PipelineListPage
        this.intervalId = setInterval(async () => await this.refreshList(), 1000);
        await this.refreshList()
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    async updateJob(job_id) {
        if (await fetchDataFromApi(`fastci/api/update_job/${job_id}`) === null) {
            // TODO: Make a toast
            console.log('Failed to update job!');
            return;
        }

        await this.refreshList();
    }

    async cancelJob(job_id) {
        if (await fetchDataFromApi(`fastci/api/cancel_job/${job_id}`) === null) {
            // TODO: Make a toast
            console.log('Failed to cancel job!');
            return;
        }

        await this.refreshList();
    }

    makeJobElement(job, index) {
        const status = JOB_STATUS_DESCRIPTION[job.status];
        const statusClass = getJobStatusClass(job);

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
                <td className={statusClass}>{status}</td>
                {/* TODO: do we need to slice the id? */}
                <td>{job.container_id.slice(0, 12)}</td>
                <td>{job.uptime_secs.toFixed(2)}</td>
                <td>
                    <button onClick={this.updateJob.bind(this, job.id)}>Update</button>
                    <button onClick={this.cancelJob.bind(this, job.id)}>Cancel</button>
                </td>
            </tr>
        );
    }

    render() {
        // TODO: paging
        // TODO: search
        // TODO: start, restart
        const elements = this.state.data.reverse().map(this.makeJobElement.bind(this));

        // maybe remove container id?
        return (
            <RequiresLogin>
                <table className="simple_table">
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
}

// The react-router-dom v6 api is hooks only. Why does everything have to be 'functional'???
function withRouter(Child) {
    return (props) => {
        const params = useParams();
        return <Child {...props} params={params}/>;
    }
}

class JobPage extends React.Component {
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
        const data = await fetchDataFromApi(`fastci/api/job/${this.state.id}`);

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
            <div key="Status">
                <label>Status</label>
                <label className={getJobStatusClass(job)}>
                    {JOB_STATUS_DESCRIPTION[job.status]}
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
                <div className="job_page_container">
                    <p className="console_output">{this.state.output}</p>
                    <div className="job_info_pane">
                        {info_elements}
                    </div>
                </div>
            </RequiresLogin>
        );
    }
}

JobPage = withRouter(JobPage);

function getPipelineStatusClass(status) {
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

class PipelinePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.params.pipeline_id,
            name: '',
            status: 0,
            jobs: [],
            graphBoxHeight: 0
        }
        this.graphBox = React.createRef();
    }

    static intervalId = null;

    async refreshPipeline() {
        const data = await fetchDataFromApi(`fastci/api/pipeline/${this.state.id}`);

        if (data === null) {
            // TODO: Make a toast
            console.log('Failed to refresh pipeline!');
            return;
        }

        // @Speed - copying this each time just doesn't feel right
        this.setState({...transformToJobsDict(data)});
    }

    async componentDidMount() {
        // NOTE: See the NOTE: in PipelineListPage
        this.intervalId = setInterval(async () => await this.refreshPipeline(), 1000);
        await this.refreshPipeline()
        this.setState({graphBoxHeight: this.graphBox.current.offsetHeight});
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const newGraphBoxHeight = this.graphBox.current.offsetHeight;

        if (prevState.graphBoxHeight !== this.state.graphBoxHeight) {
            this.setState({graphBoxHeight: newGraphBoxHeight});
        }
    }

    componentWillUnmount() {
        clearInterval(this.intervalId);
    }

    render() {
        // TODO: handle dependencies from earlier stages correctly
        // TODO: test this on more examples

        const statusClass = getPipelineStatusClass(this.state.status)
        // @Speed - inefficient - copying and recalculating this here
        const stages = topologicalSort(transformToChildrenGraph(this.state.jobs));

        let graphSegments = [];

        for (const [i, stage] of Object.entries(stages)) {
            const jobNodes = stage.map((job, i) => {
                return (
                    <div className="pipeline_graph_node" key={i}>
                        <Link to={`/job/${job.id}`}>{job.name}</Link>
                    </div>
                );
            });

            graphSegments.push(
                <div className="pipeline_graph_stage_box" key={`${i}_stage`}>
                    {jobNodes}
                </div>
            );

            if (Number(i) !== stages.length - 1) {
                let edges = [];

                for (const [fromIdx, from] of Object.entries(stage)) {
                    // FIXME: if any of children are not in the next stage (which they definitely
                    //        don't always have to be in), this works incorrectly
                    for (const [toIdx, to] of Object.entries(from.children)) {
                        /*
                          Okay.
                          So.
                          These are some hacks... Why is all of this - I want the graph
                          edges to connect to graph nodes correctly (obviously). And the nodes are
                          from the html elements world, while the edges are from svg, which don't
                          really get along. The only way I can think of to make edges snap to nodes
                          is for me to specify the path offsets by hand, using the fact that all the
                          nodes' heights and margins are in pixels and thus all positions can be
                          calculated precisely. The obvious way to do this would be to set the
                          viewBox height of the svg to be the same as the containing box's height.
                          But that doesn't work, since updating the viewBox causes the svg element
                          to stretch, which causes the containing box to stretch, which causes the
                          viewBox to update and so on... And the solution is to set the viewBox to
                          be 0 0 1 1, and just divide all pixel values by the height of the box.
                          (P.S. I set the width of the viewBox to 1 just for consistency, it's not
                          actually necessary)
                          (P.P.S. I'm sure there are many other solutions, but all of the others
                          that I can think of are equally hacky)
                         */
                        const norm = this.state.graphBoxHeight;
                        const marginTop = 5;
                        const marginBot = 15;
                        const padding = 5;
                        const borderWidth = 4;
                        const textHeight = 20;
                        const offsetY = marginTop + padding + borderWidth + textHeight / 2;
                        const diffY = textHeight + padding * 2 + borderWidth * 2 + marginTop +
                            marginBot;
                        const fromY = offsetY + diffY * fromIdx;
                        const toY = offsetY + diffY * toIdx;

                        edges.push(
                            <path
                                key={`${fromIdx}_${toIdx}`}
                                stroke="#5f8ed2"
                                fill="none"
                                strokeWidth={2 / norm}
                                markerEnd="url(#triangle)"
                                d={`M 0 ${fromY / norm} C 0.5 ${fromY / norm} 0.5 ${toY / norm} 1 ${toY / norm}`}
                            />
                        );
                    }
                }

                graphSegments.push(
                    <svg key={`${i}_edges`} preserveAspectRatio="none"
                         viewBox={`0 0 1 1`}>
                        <defs>
                            <marker id="triangle" viewBox="0 0 10 10"
                                    refX="10" refY="5"
                                    markerUnits="strokeWidth"
                                    markerWidth="5" markerHeight="5"
                                    orient="auto">
                                <path d="M 0 2 L 10 5 L 0 8 z" fill="#6d716d"/>
                            </marker>
                        </defs>
                        {edges}
                    </svg>
                );
            }
        }

        return (
            <RequiresLogin>
                <div className="pipeline_info_box">
                    <div>
                        <label>Id</label>
                        <label>{this.state.id}</label>
                    </div>
                    <div>
                        <label>Name</label>
                        <label>{this.state.name}</label>
                    </div>
                    <div>
                        <label>Status</label>
                        <label className={statusClass}>
                            {PIPELINE_STATUS_DESCRIPTION[this.state.status]}
                        </label>
                    </div>
                </div>
                <div ref={this.graphBox} className="pipeline_job_graph_box">
                    {graphSegments}
                </div>
            </RequiresLogin>
        );
    }
}

PipelinePage = withRouter(PipelinePage);


export default function App() {
    return (
        <BrowserRouter>
            <Header/>
            <div className="content_container">
                <Routes>
                    <Route path='/' element={<MainPage/>}/>
                    <Route path='/login' element={<LoginPage/>}/>
                    <Route path='/register' element={<RegisterPage/>}/>
                    <Route path='/signout' element={<SignOutPage/>}/>
                    <Route path='/pipeline_list' element={<PipelineListPage/>}/>
                    <Route path='/job_list' element={<JobListPage/>}/>
                    <Route path='/job/:job_id' element={<JobPage/>}/>
                    <Route path='/pipeline/:pipeline_id' element={<PipelinePage/>}/>
                </Routes>
            </div>
        </BrowserRouter>
    );
}
