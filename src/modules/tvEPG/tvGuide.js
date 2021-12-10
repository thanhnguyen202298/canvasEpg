import moment from 'moment';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  ScheduleToday,
  HeaderTimeLine,
  ProgramLine,
  ChannelItem,
} from './components';
import { CELLHOUR, CELL_PROGRAM_HEIGHT } from './constants';
import { genHours } from './util';
import { connect } from 'react-redux';
import { get } from 'lodash';

var a = new Date();

const VIEWABILITY_CONFIG = {
  minimumViewTime: 300,
  viewAreaCoveragePercentThreshold: 100,
};

const getOffssetRuler = () => {
  const hour = moment().hour();
  const minutehour = moment().minute() / 60;
  return (hour + minutehour) * 2 * CELLHOUR;
};

function TVGuideComponent(props) {
  const {
    listChannels = [],
    listProgrames = [],
    onReadEndContent,
    date,
    onTimeListChanged,
    timeListHeader,
    dateFetchMore,
    fetchMoreDataProgram,
    onDateChanged,
  } = props;

  const scrollAnimation = useRef(new Animated.Value(0));
  const reftimeline = useRef(null);
  const refhoriz = useRef(null);
  const refChannels = useRef(null);
  const refProgs = useRef(null);
  const [offsetruler, setOffsetRuler] = useState(getOffssetRuler());
  const timDate = new Date(date);
  timDate.setHours(0, 0, 0, 0);
  const tspStartDay = timDate.getTime();

  const initTimeListHeader = useCallback(() => {
    const initTimeList = genHours(date);
    onTimeListChanged(initTimeList);
  }, []);

  const scrollProgramTo = useCallback((offset, reff) => {
    if (reff.current) {
      reff.current.scrollTo({
        x: offset,
        y: 0,
        animated: false,
      });
    }
  }, []);

  useEffect(() => {
    initTimeListHeader();
    let offset;
    const updateRuler = () => {
      offset = getOffssetRuler();
      setOffsetRuler(offset);
    };
    updateRuler();

    scrollProgramTo(offset - CELLHOUR, reftimeline);
    scrollProgramTo(offset - CELLHOUR, refhoriz);

    const interval = setInterval(() => {
      updateRuler();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const stopAnimationScroll = useCallback(() => {
    scrollAnimation?.current.stopAnimation();
  }, []);

  const checkFetchMoreDataProgram = (p) => {
    const dateCurrent = new Date(date);
    dateCurrent.setHours(23, 59, 59, 999);
    const dateCurrentStr = dateCurrent.getDate();
    const dateFetchMoreStr = a.getDate();
    const endDateTsp = dateCurrent.getTime();
    const duration = Math.abs(endDateTsp - p.startDate) / (60 * 60 * 1000); // fetch more programs before 15h
    if (duration <= 15 && dateCurrentStr === dateFetchMoreStr) {
      fetchMoreDataProgram();
      const times = genHours(a);
      onTimeListChanged(times);
    }
  };

  const handleProgramFocus = (index, line, program) => {
    if (refChannels) {
      refChannels?.current.scrollToIndex({
        animated: true,
        index: line > 0 ? line - 1 : line,
      });
    }
    if (refProgs) {
      refProgs?.current.scrollToIndex({
        animated: true,
        index: line > 0 ? line - 1 : line,
      });
    }

    // console.log('onfocus', program)
    // const widthPro = (program.endDate - program.startDate) / (30 * 60 * 1000) * CELLHOUR
    const offset =
      (Math.abs(program?.startDate - tspStartDay) / (30 * 60 * 1000)) *
      CELLHOUR;
    scrollProgramTo(offset, refhoriz);
    scrollProgramTo(offset, reftimeline);

    const prDate = new Date(program.startDate);
    checkFetchMoreDataProgram(program);
    if (a.getDate() !== date.getDate() && a.getDate() === prDate.getDate()) {
      onDateChanged(a);
    }
  };

  const timelineUI = useMemo(
    () => <HeaderTimeLine timeList={timeListHeader} />,
    [timeListHeader],
  );

  const listProgramFooter = useMemo(() => {
    return (
      <View style={styles.listProgramFooter}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }, []);

  const onEndReached = useCallback(() => {
    onReadEndContent();
  }, []);

  useEffect(() => {
    a = dateFetchMore;
  }, [dateFetchMore]);

  const renderItemChanel = useCallback(
    ({ item, index }) => <ChannelItem channel={item} chanelIndex={index} />,
    [],
  );

  const renderItemLinePrograms = useCallback(
    ({ item, index }) => {
      const { channelExternalId, programs } = item;
      return (
        <ProgramLine
          date={date}
          onFocus={handleProgramFocus}
          lineNumber={index}
          programs={programs}
          channelExternalId={channelExternalId}
        />
      );
    },
    [listProgrames],
  );

  const getKeyExactractorChannel = useCallback((item) => `${item.id}`, []);

  const getKeyExactractorPrograms = useCallback(
    (item) => `${item.channelExternalId}`,
    [],
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: CELL_PROGRAM_HEIGHT,
      offset: CELL_PROGRAM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.guideContain}>
      <View style={styles.dFlex}>
        <ScheduleToday />
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={0.5}
          ref={reftimeline}
          onScrollBeginDrag={stopAnimationScroll}
          onScrollEndDrag={stopAnimationScroll}
        >
          {timelineUI}
        </Animated.ScrollView>
      </View>

      <View style={styles.dFlex}>
        <View style={styles.wrapChannels}>
          <FlatList
            scrollEnabled={false}
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={5}
            ref={refChannels}
            data={listChannels}
            renderItem={renderItemChanel}
            keyExtractor={getKeyExactractorChannel}
            ListEmptyComponent={listProgramFooter}
            contentContainerStyle={styles.contentScrollStyle}
            viewabilityConfig={VIEWABILITY_CONFIG}
            scrollEventThrottle={16}
            getItemLayout={getItemLayout}
          />
        </View>
        <ScrollView
          horizontal
          ref={refhoriz}
          scrollEventThrottle={16}
          onScrollBeginDrag={stopAnimationScroll}
          onScrollEndDrag={stopAnimationScroll}
        >
          <FlatList
            ref={refProgs}
            initialNumToRender={2}
            maxToRenderPerBatch={1}
            windowSize={5}
            removeClippedSubviews
            data={listProgrames}
            renderItem={renderItemLinePrograms}
            keyExtractor={getKeyExactractorPrograms}
            ListEmptyComponent={listProgramFooter}
            //   onEndReached={onEndReached}
            onEndReachedThreshold={0.9}
            contentContainerStyle={styles.contentScrollStyle}
            viewabilityConfig={VIEWABILITY_CONFIG}
            scrollEventThrottle={16}
            getItemLayout={getItemLayout}
          />

          <View style={[styles.content, { left: offsetruler }]} />
        </ScrollView>
      </View>
    </View>
  );
}

TVGuideComponent.propTypes = {
  listChannels: PropTypes.array.isRequired,
  listProgrames: PropTypes.array.isRequired,
  onReadEndContent: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => {
  return {
    dateFetchMore: get(state, 'tvGuideState.dateFetchMore'),
  };
};

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(TVGuideComponent);

const styles = StyleSheet.create({
  content: {
    width: 2,
    height: '100%',
    position: 'absolute',
    zIndex: 99,
    backgroundColor: '#ff0000',
  },
  dFlex: {
    flexDirection: 'row',
  },
  guideContain: {
    flex: 1,
  },
  wrapChannels: {
    width: 200,
  },
  listProgramFooter: {
    flex: 1,
    height: CELL_PROGRAM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScrollStyle: {
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
});
