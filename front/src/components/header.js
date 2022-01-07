import {Link, useLocation} from "react-router-dom";
import React from "react";

export default function Header() {
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
