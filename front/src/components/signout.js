import {Navigate, useLocation} from "react-router-dom";
import * as api from "../utils/api";
import React from "react";

export default function SignOutPage() {
    const from = useLocation().state?.from || null;
    api.signOut();
    return <Navigate to='/login' state={(from === null) ? null : {from: from}}/>
}

