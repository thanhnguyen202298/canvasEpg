import { TYPES as ActionTypes } from './type';
import { CHANNEL_PER_FETCH } from '../../modules/tvEPG/constants';
import { TVGuideServices } from '../../services';
import { get } from 'lodash';

export const actionSetTimeListHeaders =
  (timeListHeader = []) =>
  async (dispatch) => {
    return dispatch({
      type: ActionTypes.SET_TIME_LIST_HEADER,
      payload: timeListHeader,
    });
  };

export const actionFetchProgramsByChannels =
  ({ newListChannel = [], date }) =>
  async (dispatch) => {
    console.log('actionFetchProgramsByChannels red', newListChannel, date);
    dispatch({ type: ActionTypes.FETCH_PROGRAMS_BY_CHANNEL });
    try {
      const response = await TVGuideServices.serviceGetProgramList({
        newListChannel,
        date,
      });
      const dataResponse = get(response, 'data.response', []);
      if (dataResponse) {
        dispatch({
          type: ActionTypes.FETCH_PROGRAMS_BY_SUCCESS,
          payload: dataResponse,
          time: date,
        });
      } else {
        dispatch({
          type: ActionTypes.FETCH_PROGRAMS_BY_FAIL,
          payload: { error: ' Have an error with serve' },
        });
      }
      return dataResponse;
    } catch (ex) {
      console.log('error', ex);
      dispatch({
        type: ActionTypes.FETCH_PROGRAMS_BY_FAIL,
        payload: ex.message,
      });
      throw ex;
    }
  };

export const actionFetchChannels = () => async (dispatch) => {
  dispatch({ type: ActionTypes.FETCH_CHANNELS_LOADING });
  try {
    const res = await TVGuideServices.serviceGetChannels();
    // const channels = get(res, 'data.response', []);
    const channels1 = get(res, 'data.response', []);
    const channels = [{ ...channels1[0] }];
    if (channels) {
      dispatch({ type: ActionTypes.FETCH_CHANNELS_SUCCESS, payload: channels });
    } else {
      dispatch({
        type: ActionTypes.FETCH_CHANNELS_FAIL,
        payload: { error: ' Have an error with serve' },
      });
    }
    return channels;
  } catch (ex) {
    console.log('eror', ex);
    dispatch({ type: ActionTypes.FETCH_CHANNELS_FAIL, payload: ex.message });
    throw ex;
  }
};

export const actionUpdateDateFetchMore = (newDate) => async (dispatch) =>
  dispatch({ type: ActionTypes.UPDATE_DATE_FETCH_MORE, payload: newDate });
