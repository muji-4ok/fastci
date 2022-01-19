import {Navigate, useLocation, useNavigate} from "react-router-dom";
import * as api from "../utils/api";
import React from "react";
import {fetchResponseFromGetApi} from "../utils/api";

export default function RequiresLogin(props) {
    let {children} = props;
    let location = useLocation();
    let navigate = useNavigate();

    React.useEffect(() => {
        fetchResponseFromGetApi('fastci/api/current_user').then((response) => {
            // TODO: make a toast?
            if (response === null) {
                navigate('/login', {from: location});
            }
        });
    }, [navigate, location]);

    if (api.isLoggedIn()) {
        return children;
    } else {
        return <Navigate to='/login' state={{from: location}}/>
    }
}

