// @CopyPaste - keep in sync with backend
export const PAGE_SIZE = 20;

export function ListPaginator(props) {
    let {page, setPage, pageCount} = props;

    return (
        <div className='list_paginator'>
            <button onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
            <span>{page}</span>
            <button onClick={() => setPage(Math.min(pageCount, page + 1))}>Next</button>
        </div>
    );
}