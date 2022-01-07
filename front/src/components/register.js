import {Link, useLocation, useNavigate} from "react-router-dom";
import React from "react";
import * as api from "../utils/api";

export default function RegisterPage() {
    const from = useLocation().state?.from || null;
    let navigate = useNavigate();

    let [firstName, setFirstName] = React.useState('');
    let [lastName, setLastName] = React.useState('');
    let [username, setUsername] = React.useState('');
    let [email, setEmail] = React.useState('');
    let [password, setPassword] = React.useState('');
    let [confirmPassword, setConfirmPassword] = React.useState('');
    let [error, setError] = React.useState('\u200b');

    const handleSubmit = async (event) => {
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

        const apiResultMessage = await api.signUp(firstName, lastName, username, email, password);

        if (apiResultMessage === '') {
            navigate((from === null) ? '/' : from, {replace: true});
        } else {
            setError(apiResultMessage);
        }
    };

    return (
        <div className='submit_form'>
            <p>FastCI register</p>
            <form onSubmit={handleSubmit}>
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

