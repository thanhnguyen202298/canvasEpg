import { combineReducers } from 'redux';


import { tvguideReducer } from './tvguide.reducer';

export default combineReducers({
    tvGuideState: tvguideReducer,
});
