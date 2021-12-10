import moment from 'moment';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ProgramCell from './ProgramCell';
import PropTypes from 'prop-types';
 

const ProgramLine = props => {

  const { programs, lineNumber, onFocus, channelExternalId } = props;
  const listPrograms = programs.sort((a, b) => a.startDate - b.startDate);
  const renderList = useCallback(() => (
    listPrograms.map((program, index) => (
        <ProgramCell
          onFocus={onFocus}
          key={index.toString()}
          program={program}
          index={index}
          lineNumber={lineNumber}
          channelExternalId={channelExternalId}
        />
      )
    )
  ), []);

  return (
    <View style={programLineCss.listProgram}>
      {renderList()}
    </View>
  );
}

ProgramLine.propTypes = {
  programs: PropTypes.array.isRequired,
  lineNumber: PropTypes.number.isRequired,
  onFocus: PropTypes.func.isRequired,
};

ProgramLine.defaultProps = {
  programs: []
}

const programLineCss = StyleSheet.create({
  listProgram: {
    flex: 1,
    flexDirection: 'row',
  },
});

export default React.memo(ProgramLine);