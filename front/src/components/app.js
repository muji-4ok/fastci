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

let AuthContext = React.createContext(null);

function AuthProvider(props) {
    let {children} = props;
    let [user, setUser] = React.useState('');

    let signIn = (username, password) => {
        if (username === 'egor' && password === '123') {
            setUser(username);
            return true;
        } else {
            return false;
        }
    }

    let signUp = (firstName, lastName, username, password) => {
        setUser(username);
        return true;
    }

    let signOut = () => {
        setUser('');
    }

    let value = {user, signIn, signUp, signOut};

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
    return React.useContext(AuthContext);
}

function RequiresLogin(props) {
    let {children} = props;
    let location = useLocation();
    let auth = useAuth();
    // let isLoggedIn = auth.user !== '';
    let isLoggedIn = true;

    if (isLoggedIn) {
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

    let {signIn} = useAuth();

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

        if (signIn(username, password)) {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            setError('Incorrect username or password!');
        }
    };

    return (
        <div>
            <div className='submit_form'>
                <p className='form_title'>FastCI</p>
                <form onSubmit={handle_submit}>
                    <div className='form_field'>
                        <label>Username:</label>
                        <input
                            type='text'
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </div>
                    <div className='form_field'>
                        <label>Password:</label>
                        <input
                            type='password'
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>
                    <p className='form_error'>{error}</p>
                    <div className='form_submit'>
                        <button type='submit'>Login</button>
                    </div>
                </form>
                <Link to='/register' state={(from === null) ? null : {from: from}}>Register</Link>
            </div>
        </div>
    );
}

function RegisterPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [firstName, setFirstName] = React.useState('');
    let [lastName, setLastName] = React.useState('');
    let [username, setUsername] = React.useState('');
    let [password, setPassword] = React.useState('');
    let [confirmPassword, setConfirmPassword] = React.useState('');
    let [error, setError] = React.useState('\u200b');

    let {signUp} = useAuth();

    const handle_submit = async (event) => {
        event.preventDefault();

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

        if (signUp(firstName, lastName, username, password)) {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            // TODO: explain what went wrong
            setError('Registration failed!');
        }
    };

    return (
        <div>
            <div className='submit_form'>
                <p className='form_title'>FastCI register</p>
                <form onSubmit={handle_submit}>
                    <div className='form_field'>
                        <label>First name:</label>
                        <input
                            type='text'
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                        />
                    </div>
                    <div className='form_field'>
                        <label>Last name:</label>
                        <input
                            type='text'
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                        />
                    </div>
                    <div className='form_field'>
                        <label>Username:</label>
                        <input
                            type='text'
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </div>
                    <div className='form_field'>
                        <label>Password:</label>
                        <input
                            type='password'
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>
                    <div className='form_field'>
                        <label>Confirm password:</label>
                        <input
                            type='password'
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                    </div>
                    <p className='form_error'>{error}</p>
                    <div className='form_submit'>
                        <button type='submit'>Register</button>
                    </div>
                </form>
                <Link to='/login' state={(from === null) ? null : {from: from}}>Login</Link>
            </div>
        </div>
    );
}

function SignOutPage() {
    const from = useLocation().state?.from || null;
    let {signOut} = useAuth();

    React.useEffect(() => {
        signOut();
    });

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

function PipelineListPage() {
    return (
        <RequiresLogin>
            <div>
                <p>Pipeline list (WIP)</p>
            </div>
        </RequiresLogin>
    );
}

function getStatusClass(job) {
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

    async refreshList() {
        const response = await fetch('http://localhost:8000/fastci/api/job_list');
        const data = await response.json();
        this.setState({data: data});
    }

    async componentDidMount() {
        await this.refreshList()
        this.interval = setInterval(async () => await this.refreshList(), 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    async updateJob(job_id) {
        await fetch(`http://localhost:8000/fastci/api/update_job/${job_id}`);
        await this.refreshList();
    }

    async cancelJob(job_id) {
        await fetch(`http://localhost:8000/fastci/api/cancel_job/${job_id}`);
        await this.refreshList();
    }

    makeJobElement(job, index) {
        const status = JOB_STATUS_DESCRIPTION[job.status];
        const statusClass = getStatusClass(job);

        // TODO: make the buttons pretty
        return (
            <tr key={index}>
                <td>
                    <Link to={`/job/${job.id}`}>{job.id}</Link>
                </td>
                <td>
                    <Link to={`/job/${job.id}`}>{job.name}</Link>
                </td>
                <td>{job.pipeline}</td>
                <td className={statusClass}>{status}</td>
                <td>{job.container_id}</td>
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
        const elements = this.state.data.reverse().map(this.makeJobElement.bind(this));

        // maybe remove container id?
        return (
            <RequiresLogin>
                <table className="jobs_table">
                    <thead>
                    <tr>
                        <th>Id</th>
                        <th>Name</th>
                        <th>Pipeline</th>
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

    async refreshJob() {
        const response = await fetch(`http://localhost:8000/fastci/api/job/${this.state.id}`);
        const data = await response.json();
        this.setState({...data});
    }

    async componentDidMount() {
        await this.refreshJob()
        this.interval = setInterval(async () => await this.refreshJob(), 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    makeInfoElement(name, value) {
        return (
            <div className="job_info_element">
                <label className="job_info_element_name">{name}</label>
                <label className="job_info_element_value">{value}</label>
            </div>
        );
    }

    render() {
        // TODO: line numbers

        let info_elements = [
            this.makeInfoElement('Id', this.state.id),
            this.makeInfoElement('Name', this.state.name),
            <div className="job_info_element">
                <label className="job_info_element_name">Pipeline</label>
                <label className="job_info_element_value">
                    {/* TODO: show name of pipeline */}
                    <Link to={`/pipeline/${this.state.pipeline}`}>{this.state.pipeline}</Link>
                </label>
            </div>,
            // TODO: do we need to slice the id?
            this.makeInfoElement('Container id', this.state.container_id.slice(0, 12)),
            this.makeInfoElement('Timeout (in secs)',
                this.state.timeout_secs?.toFixed(2) ?? 'None'),
            this.makeInfoElement('Uptime (in secs)', this.state.uptime_secs.toFixed(2)),
            <div className="job_info_element">
                <label className="job_info_element_name">Status</label>
                <label className={`job_info_element_value ${getStatusClass(this.state)}`}>
                    {JOB_STATUS_DESCRIPTION[this.state.status]}
                </label>
            </div>,
            this.makeInfoElement('Error', this.state.error || 'None'),
            this.makeInfoElement('Exit code', this.state.exit_code ?? 'None'),
        ];

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


export default function App() {
    return (
        <AuthProvider>
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
                    </Routes>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}
