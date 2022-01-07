import {useParams} from "react-router-dom";
import React from "react";

// The react-router-dom v6 api is hooks only. Why does everything have to be 'functional'???
export function withRouter(Child) {
    return (props) => {
        const params = useParams();
        return <Child {...props} params={params}/>;
    }
}
