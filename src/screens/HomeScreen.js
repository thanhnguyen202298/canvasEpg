import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import {
  actionFetchChannels,
  actionFetchProgramsByChannels,
  actionSetTimeListHeaders,
  actionUpdateDateFetchMore,
} from '../redux/actions';
import { TVGuide } from '../modules';
import { get, set } from 'lodash';
import { ApiHelper } from '../core';
import TVGuide1 from '../EPG/component/TVGuideRR';
import EPGData from '../EPG/utils/EPGData';
import TVGuide2 from '../EPG/component/TVGuide';

function HomeScreen(props) {
  const {
    listChannels,
    actionFetchChannels,
    actionFetchProgramsByChannels,
    actionSetTimeListHeaders,
    listProgrames,
    timeListHeader,
    dateFetchMore,
    actionUpdateDateFetchMore,
  } = props;

  const [date, setDate] = useState(new Date());

  const onDateChanged = useCallback((newData) => {
    console.log('onDateChanged', newData);
    setDate(newData);
  }, []);

  const getListChannels = useCallback(async () => {
    const channels = await actionFetchChannels();
    const listChannelsId = channels.map((cn) => cn.externalChannelId);
    actionFetchProgramsByChannels({ newListChannel: listChannelsId, date });
  }, []);

  const fetchMoreDataProgram = () => {
    let newDate = new Date(dateFetchMore);
    newDate.setDate(dateFetchMore.getDate() + 1);
    const listChannelsId = listChannels.map((cn) => cn.externalChannelId);
    actionFetchProgramsByChannels({
      newListChannel: listChannelsId,
      date: newDate,
    });
    actionUpdateDateFetchMore(newDate);
  };

  const onTimeListChanged = useCallback((timeListHeader) => {
    actionSetTimeListHeaders(timeListHeader);
  }, []);

  useEffect(() => {
    listChannels.map((v) => {});
  }, [listChannels]);

  useEffect(() => {
    getListChannels();
  }, []);

 
  const [dataEpg, setDataEpg] = useState(new EPGData());

  return <TVGuide2 epgData={dataEpg} programs={listChannels} />;
}

const mapStateToProps = (state) => {
  return {
    listChannels: get(state, 'tvGuideState.listChannels'),
    listProgrames: get(state, 'tvGuideState.listProgrames'),
    timeListHeader: get(state, 'tvGuideState.timeListHeader'),
    dateFetchMore: get(state, 'tvGuideState.dateFetchMore'),
  };
};

const mapDispatchToProps = {
  actionFetchChannels,
  actionFetchProgramsByChannels,
  actionSetTimeListHeaders,
  actionUpdateDateFetchMore,
};

export default connect(mapStateToProps, mapDispatchToProps)(HomeScreen);
