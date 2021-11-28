/* eslint-disable prettier/prettier */
/**
 * Created by satadru on 3/30/17.
 */
import moment from 'moment';
import { DAYS_FORWARD_MILLIS } from '../component/TVGuide';
import EPGChannel from '../models/EPGChannel';
import EPGEvent from '../models/EPGEvent';

import MockDataService from '../utils/MockDataService';

export const formatDay = 'DD/MM/YYYY';

export default class EPGData {
  constructor() {
    /*this.channels = new Array();
         this.events = new Array();*/
    this.data = MockDataService.getMockData();
    if (this.data) {
      /*this.data.forEach((values, key) => {
                 this.channels.push(key);
                 values.forEach((value) => {
                     this.events.push(value);
                 });
 
             });*/
      this.channels = this.data;
      //this.events = Array.from(this.data.values());
    }
  }

  getChannel(position) {
    return this.channels[position];
  }

  getEvents(channelPosition) {
    let channel = this.channels[channelPosition];
    let events = channel.getEvents();
    return events;
  }

  getMoreEvent(day = 1) {
    const daynow = moment().format(formatDay);
    const daymilis =
      moment(daynow, formatDay).toDate().getTime() + DAYS_FORWARD_MILLIS * day;

    this.data.map((e) => {
      const events = MockDataService.createEvents(e, daymilis);
      e.events = e.events.concat(events);
      return e;
    });
  }

  getEventCount(channelPosition) {
    return this.getEvents(channelPosition).length;
  }

  getEvent(channelPosition, programPosition) {
    let channel = this.channels[channelPosition];
    let events = channel.getEvents();
    return events[programPosition];
  }

  getEventPosition(channelPosition, event) {
    let events = this.channels[channelPosition].getEvents();
    for (let i = 0; i < events.length; i++) {
      if (this.isEventSame(event, events[i])) {
        return i;
      }
    }
  }

  getChannelCount() {
    return this.channels.length;
  }

  isEventSame(event1, event2) {
    if (
      event1.getStart() == event2.getStart() &&
      event1.getEnd() == event2.getEnd()
    ) {
      return true;
    }
    return false;
  }

  hasData() {
    return this.getChannelCount() > 0;
  }
}
