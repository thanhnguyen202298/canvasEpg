import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TVEventHandler } from 'react-native';
import {
  CELLHOUR,
  HOUR_DURATION,
  CELL_PROGRAM_HEIGHT,
  guideThemes,
  MIN_PROGRAM_DURATION,
} from '../../constants';
import { TouchableOpacity } from 'react-native-tvfocus';

const CELL_TIME_DURATION = 0.5 * 60 * 60 * 1000;

const isShowContentProgram = (program) => {
  const duration = program.endDate - program.startDate;
  if (duration > MIN_PROGRAM_DURATION) return true;
  return false;
}

function ProgramCell(props) {
  const { program = {}, index, lineNumber, onFocus, channelExternalId } = props;
  const isShowContent = isShowContentProgram(program);
  const [active, setActive] = useState(false);

  const { endDate, startDate, id } = program;
  const duration = endDate - startDate;

  // console.log('program duration', duration, program)
  const widthProgram = (CELLHOUR * duration) / CELL_TIME_DURATION;

  const handleCellFocus = useCallback((e) => {
    setActive(true);
    if (onFocus) {
      onFocus(index, lineNumber, program);
    }
  }, [index, lineNumber]);

  const handleCellBlur = useCallback(() => {
    setActive(false);
  });


  if (!program) return <View />;

  return (
    (!endDate || !startDate || id === -1) ? (
      <TouchableOpacity
        activeOpacity={1}
        onFocus={handleCellFocus}
        onBlur={handleCellBlur}
        style={
          [
            styles.contain,
            active ? styles.backActive : styles.backBlur,
            { width: widthProgram },
          ]
        }>
        {isShowContent && <View>
          <Text style={styles.title} numberOfLines={1}>{` No program`}</Text>

        </View>
        }
      </TouchableOpacity >

    ) :
      (
        <TouchableOpacity
          activeOpacity={1}
          onFocus={handleCellFocus}
          onBlur={handleCellBlur}
          style={
            [
              styles.contain,
              active ? styles.backActive : styles.backBlur,
              { width: widthProgram },
            ]
          }
        >
          {isShowContent && <View>
            <Text style={styles.title} numberOfLines={1}>{program?.name}</Text>
            <Text style={styles.time}>
              {`${moment(program?.startDate).format('HH:mm')}`}{' '}
              <Text style={styles.time}>{` - ${moment(program?.endDate).format(
                'HH:mm',
              )}`}</Text>
            </Text>
          </View>
          }
        </TouchableOpacity >
      )
  )


}

// export default React.memo(ProgramCell)
export default ProgramCell

const styles = StyleSheet.create({
  backActive: {
    backgroundColor: guideThemes.BG_ACTIVE,
  },
  backBlur: {
    backgroundColor: guideThemes.BG_CELL,
  },
  contain: {
    color: '#ffff',
    height: CELL_PROGRAM_HEIGHT,
    justifyContent: 'center',
    padding: 5,
    borderTopColor: '#151e68',
    borderTopWidth: 1,
    borderStartColor: '#151e68',
    borderStartWidth: 1,
  },
  content: {
    //  color: '#ffff',
  },
  innerView: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    color: guideThemes.COLOR_TEXT,
    // fontSize: 18
  },
  time: {
    color: guideThemes.COLOR_TEXT,
    // fontSize: 16
  },
});
