import React from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
    useNavigate
} from 'react-router-dom';

function Header() {
    let location = useLocation();
    console.log('Header:', location);

    return (
        <div className='menu'>
            <Link to='/'>Main page</Link>
            <Link to='/pipeline_list'>Pipeline list</Link>
            <Link to='/job_list'>Job list</Link>
            <Link to='/signout' state={{ from: location }}>Sign out</Link>
        </div>
    );
}

let AuthContext = React.createContext(null);

function AuthProvider(props) {
    let { children } = props;
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

    let value = { user, signIn, signUp, signOut };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
    return React.useContext(AuthContext);
}

function RequiresLogin(props) {
    let { children } = props;
    let location = useLocation();
    let auth = useAuth();
    let isLoggedIn = auth.user !== '';

    if (isLoggedIn) {
        return children;
    } else {
        return <Navigate to='/login' state={{ from: location }} />
    }
}

function LoginPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [username, setUsername] = React.useState('');
    let [password, setPassword] = React.useState('');
    let initialMessage = (from === '/login') ? '\u200b' : 'You need to login to view this page!';
    let [error, setError] = React.useState(initialMessage);

    let { signIn } = useAuth();

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
            navigate((from === null) ? '/' : from, { replace: true });
        } else {
            setError('Incorrect username or password!');
            return;
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
                <Link to='/register' state={(from === null) ? null : { from: from }}>Register</Link>
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

    let { signUp } = useAuth();

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
            navigate((from === null) ? '/' : from, { replace: true });
        } else {
            // TODO: explain what went wrong
            setError('Registration failed!');
            return;
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
                <Link to='/login' state={(from === null) ? null : { from: from }}>Login</Link>
            </div>
        </div>
    );
}

function SignOutPage() {
    const from = useLocation().state?.from || null;
    let { signOut } = useAuth();
    console.log('SignOutPage from = ', from);

    React.useEffect(() => {
        signOut();
    });

    return <Navigate to='/login' state={(from === null) ? null : { from: from }} />
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

function JobListPage() {
    return (
        <RequiresLogin>
            <div>
                <p>Job list (WIP)</p>
            </div>
        </RequiresLogin>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Header />
                <Routes>
                    <Route path='/' element={<MainPage />} />
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='/register' element={<RegisterPage />} />
                    <Route path='/signout' element={<SignOutPage />} />
                    <Route path='/pipeline_list' element={<PipelineListPage />} />
                    <Route path='/job_list' element={<JobListPage />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
