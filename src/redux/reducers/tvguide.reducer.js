import { ActionTypes } from '../actions';
const APP_CONFIG = require('../../configs/app_config.json');
import { fillProgrames } from '../../modules/tvEPG/util';
import { isEmpty, isArray, map, assign, find, merge } from 'lodash';
import EPGChannel from '../../EPG/models/EPGChannel';

const initState = {
  fetchingChannels: false,
  listChannels: [],
  listProgrames: [],
  timeListHeader: [],
  dateFetchMore: new Date(),
};

export const processChannelAttachments = (channel) => {
  let artworks = {};
  if (channel.attachments) {
    channel.attachments.forEach((attachement) => {
      if (APP_CONFIG.assetsMapping.channels[attachement.name]) {
        artworks[APP_CONFIG.assetsMapping.channels[attachement.name]] =
          attachement.value;
      }
    });
  }
  return artworks;
};

export const tvguideReducer = (state = initState, action) => {
  const { type, payload } = action || {};
  switch (type) {
    case ActionTypes.SET_TIME_LIST_HEADER: {
      console.log('SET_TIME_LIST_HEADER', action);
      return {
        ...state,
        timeListHeader: [...state.timeListHeader, ...payload],
      };
    }

    case ActionTypes.FETCH_CHANNELS_LOADING: {
      return {
        ...state,
        fetchingChannels: true,
      };
    }
    case ActionTypes.FETCH_CHANNELS_SUCCESS: {
      let newEntities = [];

      newEntities = payload.map((channel) => {
        const epgChannel = new EPGChannel(
          processChannelAttachments(channel)['logo'],
          channel.name,
          channel.externalChannelId,
        );
        epgChannel.channelExternalId = channel.channelExternalId;

        return epgChannel;
      });
      console.log('chanel', newEntities);
      return {
        ...state,
        fetchingChannels: false,
        listChannels: [...state.listChannels, ...newEntities],
      };
    }
    case ActionTypes.FETCH_CHANNELS_FAIL: {
      return {
        ...state,
        fetchingChannels: false,
        errorLogin: payload,
      };
    }
    case ActionTypes.FETCH_PROGRAMS_BY_CHANNEL: {
      return {
        ...state,
        fetchListProgrames: true,
      };
    }
    case ActionTypes.FETCH_PROGRAMS_BY_SUCCESS: {
      const { time } = action;
      let combind = [];
      let payloadProcced = fillProgrames(payload, time);

      combind = state.listChannels.map((cn) => {
        const channelMap = payloadProcced.find(
          (channel) =>
            channel.channelExternalId === cn.channelExternalId ||
            channel.channelExternalId === cn.id,
        );

        let newPrograms = [...cn.events, ...channelMap.events];
        return {
          ...cn,
          events: newPrograms,
        };
      });

      const newData = combind;

      if (newData.events) console.log(payloadProcced);
      return {
        ...state,
        fetchListProgrames: false,
        listChannels: newData,
      };
    }
    case ActionTypes.FETCH_PROGRAMS_BY_FAIL: {
      return {
        ...state,
        fetchListProgrames: false,
        errorLogin: payload,
      };
    }

    case ActionTypes.UPDATE_DATE_FETCH_MORE: {
      console.log('UPDATE_DATE_FETCH_MORE', payload);
      return {
        ...state,
        dateFetchMore: payload,
      };
    }

    default:
      return state;
  }
};

export default tvguideReducer;
