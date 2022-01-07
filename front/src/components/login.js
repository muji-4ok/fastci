import {Link, useLocation, useNavigate} from "react-router-dom";
import React from "react";
import * as api from "../utils/api";

export default function LoginPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [username, setUsername] = React.useState('');
    let [password, setPassword] = React.useState('');
    let initialMessage = (from === null || from.pathname === '/login') ? '\u200b'
        : 'You need to login to view this page!';
    let [error, setError] = React.useState(initialMessage);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!username) {
            setError('You need to specify the username!');
            return;
        }

        if (!password) {
            setError('You need to specify the password!');
            return;
        }

        const message = await api.signIn(username, password);

        if (message === '') {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            setError(message);
        }
    };

    return (
        <div className='submit_form'>
            <p>FastCI</p>
            <form onSubmit={handleSubmit}>
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

