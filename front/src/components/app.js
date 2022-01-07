import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import RequiresLogin from "./requires_login";
import Header from "./header";
import LoginPage from "./login";
import RegisterPage from "./register";
import SignOutPage from "./signout";
import PipelineListPage from "./pipeline_list";
import JobListPage from "./job_list";
import JobPage from "./job";
import PipelinePage from "./pipeline";

function MainPage() {
    return (
        <RequiresLogin>
            <div>
                <p>Main page (WIP)</p>
                <p>There should be some statistics or something idk</p>
            </div>
        </RequiresLogin>
    );
}


export default function App() {
    return (
        <BrowserRouter>
            <Header/>
            <div className='content_container'>
                <Routes>
                    <Route path='/' element={<MainPage/>}/>
                    <Route path='/login' element={<LoginPage/>}/>
                    <Route path='/register' element={<RegisterPage/>}/>
                    <Route path='/signout' element={<SignOutPage/>}/>
                    <Route path='/pipeline_list' element={<PipelineListPage/>}/>
                    <Route path='/job_list' element={<JobListPage/>}/>
                    <Route path='/job/:job_id' element={<JobPage/>}/>
                    <Route path='/pipeline/:pipeline_id' element={<PipelinePage/>}/>
                </Routes>
            </div>
        </BrowserRouter>
    );
}
