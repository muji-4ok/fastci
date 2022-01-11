import React from "react";

export default function ActionWithTooltip(props) {
    let {onClick, iconClass, actionName} = props;

    return (
        <i className={`${iconClass} action_with_tooltip fa_icon_fix_size`} onClick={onClick}>
            <span>{actionName}</span>
        </i>
    );
}

