import React from "react";

const API_BASE = 'http://localhost:8000';

export async function signIn(username, password) {
    // The / at the end is needed for django for some reason
    const response = await doCallPostApi('api/token/', {
        username: username,
        password: password
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

async function doCallPostApi(path, data, extraHeaders = {}) {
    // Low-level call - doesn't do any auth. Just calls fetch with POST, sets content-type and
    // does JSON.stringify.
    // Returns response
    const url = `${API_BASE}/${path}`;

    return await fetch(url, {
        method: 'POST',
        headers: {...extraHeaders, 'Content-Type': 'Application/json'},
        body: JSON.stringify(data)
    });
}

async function refreshAccessToken() {
    const refreshToken = window.localStorage.getItem('REFRESH_TOKEN') || '';

    // The / at the end is needed for django for some reason
    const response = await doCallPostApi('api/token/refresh/', {refresh: refreshToken});
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

export async function signUp(firstName, lastName, username, email, password) {
    // The / at the end is needed for django for some reason
    const response = await doCallPostApi('fastci/api/create_user/', {
        username: username,
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password
    });
    const data = await response.json();

    if (response.status === 201) {
        await signIn(username, password);
        return '';
    } else {
        // TODO: handle unexpected data
        return Object.keys(data).map(
            (name, i) => name + ': ' + data[name].join(' ')
        ).join('\n');
    }
}

export function signOut() {
    window.localStorage.removeItem('ACCESS_TOKEN');
    window.localStorage.removeItem('REFRESH_TOKEN');
}

export function isLoggedIn() {
    if (!window.localStorage.getItem('REFRESH_TOKEN')) {
        return false;
    }

    // The fact that the token is valid is checked in RequiresLogin via an effect, keeping this
    // function sync

    return true;
}

async function doCallApi(path) {
    // low level call - returns the response, doesn't try to refresh the token, just passes the
    // stored access token
    const url = `${API_BASE}/${path}`;
    return await fetch(url, {headers: makeAuthHeaders()});
}

function makeAuthHeaders() {
    const accessToken = window.localStorage.getItem('ACCESS_TOKEN') || '';
    return {
        Authorization: `Bearer ${accessToken}`
    };
}

// TODO: Refactor all of the api fetching functions to be more understandable
export async function fetchResponseFromPostApi(path, data) {
    // Returns the response, doesn't read the data
    let response = await doCallPostApi(path, data, makeAuthHeaders());

    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            return null;
        } else {
            response = await doCallPostApi(path, data, makeAuthHeaders());

            // It may so happen that the token is valid and refreshes with no problems, but the user
            // linked to this token no longer exists. And so the backend will reject our attempt
            // only at this point.
            if (response.status === 401) {
                return null;
            }
        }
    }

    return response;
}

export async function fetchResponseFromGetApi(path) {
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

    return response;
}

export async function fetchDataFromGetApi(path) {
    // Throws a JSON decode error if data is empty
    const response = await fetchResponseFromGetApi(path);
    return await response.json();
}

export function useWebsocketScheduler(targetFunction) {
    // NOTE: targetFunction likely should be a callback
    let socketRef = React.useRef(null);
    let [socketReset, setSocketReset] = React.useState(0);

    React.useEffect(() => {
        socketRef.current = new WebSocket('ws://localhost:8000/ws/');
        console.log('WebSocket connect');

        socketRef.current.onopen = () => socketRef.current.send('go?');
        socketRef.current.onmessage = async () => {
            await targetFunction();
            socketRef.current.send('go?');
        };
        socketRef.current.onclose = (event) => {
            if (!event.wasClean) {
                setSocketReset(socketReset + 1);
            }
        };

        // Ignoring for now
        targetFunction();

        return () => socketRef.current.close();
    }, [socketRef, socketReset, targetFunction]);

    // Could return connection reset function if needed
}