import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from '../reducers';
 
// Note: this API requires redux@>=3.1.0
export const store = createStore(rootReducer, applyMiddleware(thunk));