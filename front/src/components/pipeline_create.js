import React from "react";
import * as api from "../utils/api";

export default function PipelineCreatePage() {
    let [file, setFile] = React.useState(null);
    let [error, setError] = React.useState('\u200b');

    async function handleSubmit(event) {
        let text = '';

        // In theory, this logic can be very cleanly expressed with Promises and then/catch, but
        // the API sucks ass
        try {
            text = await file.text();
        } catch (e) {
            setError('Failed reading file');
            return;
        }

        let data = null;

        try {
            data = JSON.parse(text);
        } catch (e) {
            setError('Failed to parse json');
            return;
        }

        // The / at the end is needed for django for some reason
        let response = await api.fetchResponseFromPostApi('fastci/api/create_pipeline/', data);

        if (response.status === 200) {
            setError('\u200b');
        } else if (response.status === 400) {
            let responseData = await response.json();

            if ('detail' in responseData) {
                setError(responseData['detail']);
            } else {
                setError(JSON.stringify(responseData));
            }
        } else {
            console.log(response);
            setError('Failed to call api');
        }
    }

    return (
        <div className='pipeline_list_creation_container'>
            <div>
                <label>Pipeline config:</label>
                <input
                    type='file'
                    accept='application/json'
                    onChange={(event) => setFile(event.target.files[0])}
                />
            </div>
            <span>{error}</span>
            <button type='submit' onClick={handleSubmit}>Create pipeline</button>
        </div>
    );
}

