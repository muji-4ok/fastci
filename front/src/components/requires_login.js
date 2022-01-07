import {Navigate, useLocation} from "react-router-dom";
import * as api from "../utils/api";
import React from "react";

export default function RequiresLogin(props) {
    let {children} = props;
    let location = useLocation();

    if (api.isLoggedIn()) {
        return children;
    } else {
        return <Navigate to='/login' state={{from: location}}/>
    }
}

