/* eslint-disable no-undef */
/**
 * Created by satadru on 3/31/17.
 */
import React, { Component, createRef } from 'react';

import Rect from '../models/Rect';
import EPGData from '../utils/EPGData';
import EPGUtils from '../utils/EPGUtils';

import { Dimensions, StyleSheet, View, TVEventHandler } from 'react-native';
import Canvas, { Image as CanvasImage } from 'react-native-canvas';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

export const DAYS_BACK_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
export const DAYS_FORWARD_MILLIS = 1 * 24 * 60 * 60 * 1000; // 3 days
export const HOURS_IN_VIEWPORT_MILLIS = 2 * 60 * 60 * 1000; // 2 hours
export const TIME_LABEL_SPACING_MILLIS = 30 * 60 * 1000; // 30 minutes

export const VISIBLE_CHANNEL_COUNT = 6; // No of channel to show at a time
export const VERTICAL_SCROLL_BOTTOM_PADDING_ITEM = 2;
export const VERTICAL_SCROLL_TOP_PADDING_ITEM = 2;

export default class TVGuide2 extends Component {
  constructor(props) {
    super(props);
    this._tvEventHandler = new TVEventHandler();
    this.handleClick = this.handleClick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);

    this.getViewEpg = this.getViewEpg.bind(this);
    this.getCotainer = this.getCotainer.bind(this);
    this.handleCanvas = this.handleCanvas.bind(this);

    this.epgData = props.epgData;
    // this.epgData.channels = props.programs;
    this.epgUtils = new EPGUtils();

    this.scrollX = 0;
    this.scrollY = 0;
    this.focusedChannelPosition = 0;
    this.focusedEventPosition = -1;
    //this.state = {translate3d : `translate3d(${this.scrollX}px, 0px, 0px)`};
    //this.translate3d = `translate3d(${this.scrollX}px, 0px, 0px)`;

    this.mChannelImageCache = new Map();

    this.mClipRect = new Rect();
    this.mDrawingRect = new Rect();
    this.mMeasuringRect = new Rect();

    this.mEPGBackground = '#1e1e1e';
    this.mVisibleChannelCount = 6;
    this.mChannelLayoutMargin = 3;
    this.mChannelLayoutPadding = 8;
    this.mChannelLayoutHeight = 70;
    this.mChannelLayoutWidth = 70;
    this.mChannelLayoutBackground = '#323232';

    //this.mEventLayoutBackground = '#4f4f4f';
    this.mEventLayoutBackground = '#234054';
    //this.mEventLayoutBackgroundCurrent = '#4f4f4f';
    this.mEventLayoutBackgroundCurrent = '#234054';
    this.mEventLayoutBackgroundFocus = 'rgba(65,182,230,1)';
    this.mEventLayoutTextColor = '#d6d6d6';
    this.mEventLayoutTextSize = 20;

    this.mTimeBarHeight = 30;
    this.mTimeBarTextSize = 14;
    this.mTimeBarLineWidth = 2;
    this.mTimeBarLineColor = '#c57120';

    this.mResetButtonSize = 40;
    this.mResetButtonMargin = 10;

    this.page = 0;
    this.loading = false;

    this.canvasRe = React.createRef(null);
    this.epgParent = React.createRef(null);
    this.containCanvas = React.createRef(null);

    //this.resetBoundaries();
  }

  resetBoundaries() {
    this.mMillisPerPixel = this.calculateMillisPerPixel();
    this.mTimeOffset = this.calculatedBaseLine();
    this.mTimeLowerBoundary = this.getTimeFrom(0);
    this.mTimeUpperBoundary = this.getTimeFrom(this.getWidth());
  }

  calculateMaxHorizontalScroll() {
    this.mMaxHorizontalScroll = parseInt(
      (DAYS_BACK_MILLIS + DAYS_FORWARD_MILLIS - HOURS_IN_VIEWPORT_MILLIS) /
        this.mMillisPerPixel,
    );
  }

  calculateMaxVerticalScroll() {
    let maxVerticalScroll =
      this.getTopFrom(this.epgData.getChannelCount() - 2) +
      this.mChannelLayoutHeight;
    this.mMaxVerticalScroll =
      maxVerticalScroll < this.getHeight()
        ? 0
        : maxVerticalScroll - this.getHeight();
  }

  calculateMillisPerPixel() {
    return (
      HOURS_IN_VIEWPORT_MILLIS /
      (this.getWidth() - this.mChannelLayoutWidth - this.mChannelLayoutMargin)
    );
  }

  calculatedBaseLine() {
    //return LocalDateTime.now().toDateTime().minusMillis(DAYS_BACK_MILLIS).getMillis();
    return Date.now() - DAYS_BACK_MILLIS;
  }

  getProgramPosition(channelPosition, time) {
    let events = this.epgData.getEvents(channelPosition);
    if (events != null) {
      for (let eventPos = 0; eventPos < events.length; eventPos++) {
        let event = events[eventPos];
        if (event.start <= time && event.end >= time) {
          return eventPos;
        }
      }
    }
    return -1;
  }

  getFirstVisibleChannelPosition() {
    let y = this.getScrollY(false);

    let position = parseInt(
      (y - this.mChannelLayoutMargin - this.mTimeBarHeight) /
        (this.mChannelLayoutHeight + this.mChannelLayoutMargin),
    );

    if (position < 0) {
      position = 0;
    }
    return position;
  }

  getLastVisibleChannelPosition() {
    let y = this.getScrollY(false);
    let totalChannelCount = this.epgData.getChannelCount();
    let screenHeight = this.getHeight();
    let position = parseInt(
      (y + screenHeight + this.mTimeBarHeight - this.mChannelLayoutMargin) /
        (this.mChannelLayoutHeight + this.mChannelLayoutMargin),
    );

    if (position > totalChannelCount - 1) {
      position = totalChannelCount - 1;
    }

    // Add one extra row if we don't fill screen with current..
    return y + screenHeight > position * this.mChannelLayoutHeight &&
      position < totalChannelCount - 1
      ? position + 1
      : position;
  }

  getXFrom(time) {
    return parseInt(
      (time - this.mTimeLowerBoundary) / this.mMillisPerPixel +
        this.mChannelLayoutMargin +
        this.mChannelLayoutWidth +
        this.mChannelLayoutMargin,
    );
  }

  getTopFrom(position) {
    let y =
      position * (this.mChannelLayoutHeight + this.mChannelLayoutMargin) +
      this.mChannelLayoutMargin +
      this.mTimeBarHeight;
    return y - this.getScrollY(false);
  }

  getXPositionStart() {
    return this.getXFrom(Date.now() - HOURS_IN_VIEWPORT_MILLIS / 2);
  }

  getTimeFrom(x) {
    return x * this.mMillisPerPixel + this.mTimeOffset;
  }

  shouldDrawTimeLine(now) {
    return now >= this.mTimeLowerBoundary && now < this.mTimeUpperBoundary;
  }

  isEventVisible(start, end) {
    return (
      (start >= this.mTimeLowerBoundary && start <= this.mTimeUpperBoundary) ||
      (end >= this.mTimeLowerBoundary && end <= this.mTimeUpperBoundary) ||
      (start <= this.mTimeLowerBoundary && end >= this.mTimeUpperBoundary)
    );
  }

  getFocusedChannelPosition() {
    return this.focusedChannelPosition;
  }

  getFocusedEventPosition() {
    return this.focusedEventPosition;
  }

  isRTL() {
    return false;
  }

  getScrollX(neglect = true) {
    if (neglect) {
      return 0;
    }
    return this.scrollX;
    //return window.scrollX;
  }

  getScrollY(neglect = true) {
    if (neglect) {
      return 0;
    }
    return this.scrollY;
    //return window.scrollY;
  }

  getWidth() {
    return 1280;
  }

  getHeight() {
    return (
      this.mTimeBarHeight +
      (this.mChannelLayoutMargin + this.mChannelLayoutHeight) *
        VISIBLE_CHANNEL_COUNT
    );
  }

  onDraw(canvas) {
    if (this.epgData != null && this.epgData.hasData()) {
      this.mTimeLowerBoundary = this.getTimeFrom(this.getScrollX(false));
      this.mTimeUpperBoundary = this.getTimeFrom(
        this.getScrollX(false) + this.getWidth(),
      );

      let drawingRect = this.mDrawingRect;
      //console.log("X:" + this.getScrollX());
      drawingRect.left = this.getScrollX();
      drawingRect.top = this.getScrollY();
      drawingRect.right = drawingRect.left + this.getWidth();
      drawingRect.bottom = drawingRect.top + this.getHeight();

      this.drawChannelListItems(canvas, drawingRect);
      this.drawEvents(canvas, drawingRect);
      this.drawTimebar(canvas, drawingRect);
      this.drawTimeLine(canvas, drawingRect);
      //drawResetButton(canvas, drawingRect);
      //   this.drawFocusEvent(canvas, drawingRect);
    }
  }

  drawTimebar(canvas, drawingRect) {
    drawingRect.left =
      this.getScrollX() + this.mChannelLayoutWidth + this.mChannelLayoutMargin;
    drawingRect.top = this.getScrollY();
    drawingRect.right = drawingRect.left + this.getWidth();
    drawingRect.bottom = drawingRect.top + this.mTimeBarHeight;

    this.mClipRect.left =
      this.getScrollX() + this.mChannelLayoutWidth + this.mChannelLayoutMargin;
    this.mClipRect.top = this.getScrollY();
    this.mClipRect.right = this.getScrollX() + this.getWidth();
    this.mClipRect.bottom = this.mClipRect.top + this.mTimeBarHeight;

    //canvas.save();
    //canvas.rect(this.mClipRect.left, this.mClipRect.top, this.mClipRect.width, this.mClipRect.height);
    //canvas.clip();

    // Background
    canvas.fillStyle = this.mChannelLayoutBackground;
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Time stamps
    //mPaint.setColor(mEventLayoutTextColor);
    //mPaint.setTextSize(mTimeBarTextSize);
    canvas.fillStyle = this.mEventLayoutTextColor;
    if (this.isRTL()) {
      //canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.save();
      canvas.setTransform(1, 0, 0, 1, 0, 0);
    }

    for (
      let i = 0;
      i < HOURS_IN_VIEWPORT_MILLIS / TIME_LABEL_SPACING_MILLIS;
      i++
    ) {
      // Get time and round to nearest half hour
      let time =
        TIME_LABEL_SPACING_MILLIS *
        ((this.mTimeLowerBoundary +
          TIME_LABEL_SPACING_MILLIS * i +
          TIME_LABEL_SPACING_MILLIS / 2) /
          TIME_LABEL_SPACING_MILLIS);

      if (this.isRTL()) {
        canvas.fillText(
          this.epgUtils.getShortTime(time),
          this.getWidth() +
            this.mChannelLayoutMargin +
            this.mChannelLayoutMargin -
            this.mChannelLayoutHeight -
            this.getXFrom(time),
          drawingRect.top +
            ((drawingRect.bottom - drawingRect.top) / 2 +
              this.mTimeBarTextSize / 2),
        );
      } else {
        canvas.fillText(
          this.epgUtils.getShortTime(time),
          this.getXFrom(time),
          drawingRect.top +
            ((drawingRect.bottom - drawingRect.top) / 2 +
              this.mTimeBarTextSize / 2),
        );
      }
    }
    if (this.isRTL()) {
      this.ctx.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      //canvas.restore();
    }

    //canvas.restore();

    this.drawTimebarDayIndicator(canvas, drawingRect);
    this.drawTimebarBottomStroke(canvas, drawingRect);
  }

  drawTimebarDayIndicator(canvas, drawingRect) {
    drawingRect.left = this.getScrollX();
    drawingRect.top = this.getScrollY();
    drawingRect.right = drawingRect.left + this.mChannelLayoutWidth;
    drawingRect.bottom = drawingRect.top + this.mTimeBarHeight;

    // Background
    //mPaint.setColor(mChannelLayoutBackground);
    canvas.fillStyle = this.mChannelLayoutBackground;
    //canvas.drawRect(drawingRect, mPaint);
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Text
    //mPaint.setColor(mEventLayoutTextColor);
    canvas.fillStyle = this.mEventLayoutTextColor;
    //mPaint.setTextSize(mTimeBarTextSize);
    //mPaint.setTextAlign(Paint.Align.CENTER);
    canvas.textAlign = 'center';
    //canvas.drawText(EPGUtil.getWeekdayName(mTimeLowerBoundary),
    //drawingRect.left + ((drawingRect.right - drawingRect.left) / 2),
    //drawingRect.top + (((drawingRect.bottom - drawingRect.top) / 2) + (mTimeBarTextSize / 2)), mPaint);
    if (this.isRTL()) {
      //canvas.save();
      canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.scale(-1, 1);

      canvas.fillText(
        this.epgUtils.getWeekdayName(this.mTimeLowerBoundary),
        this.getWidth() +
          this.mChannelLayoutMargin +
          this.mChannelLayoutMargin -
          this.mChannelLayoutHeight -
          drawingRect.left +
          (drawingRect.right - drawingRect.left) / 2,
        drawingRect.top +
          ((drawingRect.bottom - drawingRect.top) / 2 +
            this.mTimeBarTextSize / 2),
      );
    } else {
      canvas.fillText(
        this.epgUtils.getWeekdayName(this.mTimeLowerBoundary),
        drawingRect.left + (drawingRect.right - drawingRect.left) / 2,
        drawingRect.top +
          ((drawingRect.bottom - drawingRect.top) / 2 +
            this.mTimeBarTextSize / 2),
      );
    }

    if (this.isRTL()) {
      this.ctx.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
    }

    //mPaint.setTextAlign(Paint.Align.LEFT);
    canvas.textAlign = 'left';
  }

  drawTimebarBottomStroke(canvas, drawingRect) {
    drawingRect.left = this.getScrollX();
    drawingRect.top = this.getScrollY() + this.mTimeBarHeight;
    drawingRect.right = drawingRect.left + this.getWidth();
    drawingRect.bottom = drawingRect.top + this.mChannelLayoutMargin;

    // Bottom stroke
    //mPaint.setColor(mEPGBackground);
    canvas.fillStyle = this.mEPGBackground;
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );
  }

  drawTimeLine(canvas, drawingRect) {
    let now = Date.now();
    if (this.shouldDrawTimeLine(now)) {
      drawingRect.left = this.getXFrom(now);
      drawingRect.top = this.getScrollY();
      drawingRect.right = drawingRect.left + this.mTimeBarLineWidth;
      drawingRect.bottom = drawingRect.top + this.getHeight();

      //mPaint.setColor(mTimeBarLineColor);
      canvas.fillStyle = this.mTimeBarLineColor;
      //canvas.drawRect(drawingRect, mPaint);
      canvas.fillRect(
        drawingRect.left,
        drawingRect.top,
        drawingRect.width,
        drawingRect.height,
      );
    }
  }

  drawEvents(canvas, drawingRect) {
    let firstPos = this.getFirstVisibleChannelPosition();
    let lastPos = this.getLastVisibleChannelPosition();

    //console.log ("First: " + firstPos + " Last: " + lastPos);

    for (let pos = firstPos; pos <= lastPos; pos++) {
      // Set clip rectangle
      this.mClipRect.left =
        this.getScrollX() +
        this.mChannelLayoutWidth +
        this.mChannelLayoutMargin;
      this.mClipRect.top = this.getTopFrom(pos);
      this.mClipRect.right = this.getScrollX() + this.getWidth();
      this.mClipRect.bottom = this.mClipRect.top + this.mChannelLayoutHeight;

      //canvas.save();
      //canvas.rect(this.mClipRect.left, this.mClipRect.top, this.mClipRect.width, this.mClipRect.height);
      //canvas.clip();

      // Draw each event
      let foundFirst = false;

      let epgEvents = this.epgData.getEvents(pos);
      if (this.isRTL()) {
        //canvas.setTransform(1, 0, 0, 1, 0, 0);
        //canvas.textAlign = "right";
      }

      for (let event of epgEvents) {
        if (this.isEventVisible(event.start, event.end)) {
          this.drawEvent(canvas, pos, event, drawingRect);
          foundFirst = true;
        } else if (foundFirst) {
          break;
        }
      }

      if (this.isRTL()) {
        //this.ctx.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      }

      //canvas.restore();
    }
  }

  drawEvent(canvas, channelPosition, event, drawingRect) {
    this.setEventDrawingRectangle(
      channelPosition,
      event.start,
      event.end,
      drawingRect,
    );

    // Background
    //mPaint.setColor(event.isCurrent() ? mEventLayoutBackgroundCurrent : mEventLayoutBackground);
    canvas.fillStyle = event.isCurrent()
      ? this.mEventLayoutBackgroundCurrent
      : this.mEventLayoutBackground;
    if (channelPosition == this.getFocusedChannelPosition()) {
      let focusedEventPosition = this.getFocusedEventPosition();
      if (focusedEventPosition != -1) {
        let focusedEvent = this.epgData.getEvent(
          channelPosition,
          focusedEventPosition,
        );
        if (focusedEvent == event) {
          canvas.fillStyle = this.mEventLayoutBackgroundFocus;
        }
      } else if (event.isCurrent()) {
        this.focusedEventPosition = this.epgData.getEventPosition(
          channelPosition,
          event,
        );
        canvas.fillStyle = this.mEventLayoutBackgroundFocus;
      }
    }
    //canvas.drawRect(drawingRect, mPaint);
    // if Clip is not working properly, hack
    if (
      drawingRect.left <
      this.getScrollX() + this.mChannelLayoutWidth + this.mChannelLayoutMargin
    ) {
      drawingRect.left =
        this.getScrollX() +
        this.mChannelLayoutWidth +
        this.mChannelLayoutMargin;
    }
    canvas.fillRect(
      drawingRect.left,
      drawingRect.top,
      drawingRect.width,
      drawingRect.height,
    );

    // Add left and right inner padding
    drawingRect.left += this.mChannelLayoutPadding;
    drawingRect.right -= this.mChannelLayoutPadding;

    // Text
    //mPaint.setColor(mEventLayoutTextColor);
    //mPaint.setTextSize(mEventLayoutTextSize);
    canvas.font = '20 px Arial';
    canvas.fillStyle = '#aaff00';
    const start = moment(event.start).format('HH:MM');
    const end = moment(event.end).format('HH:MM');
    canvas.fillText(
      `Start: ${start}`,
      drawingRect.left,
      drawingRect.bottom - 25,
    );

    canvas.fillText(`End: ${end}`, drawingRect.left, drawingRect.bottom - 10);

    // Move drawing.top so text will be centered (text is drawn bottom>up)
    //mPaint.getTextBounds(event.getTitle(), 0, event.getTitle().length(), mMeasuringRect);
    drawingRect.top += (drawingRect.bottom - drawingRect.top) / 4;
    canvas.fillStyle = this.mEventLayoutTextColor;
    let title = event.getTitle();
    /*title = title.substring(0,
         mPaint.breakText(title, true, drawingRect.right - drawingRect.left, null));*/
    if (this.isRTL()) {
      //canvas.setTransform(1, 0, 0, 1, 0, 0);
      //canvas.fillText(title, (this.getWidth() + this.mChannelLayoutMargin + this.mChannelLayoutMargin - this.mChannelLayoutHeight) - drawingRect.left, drawingRect.top);
      //canvas.scale(1, -1);
      console.log('LEFT :' + drawingRect.left);
      canvas.fillText(title, drawingRect.left, drawingRect.top);
      //canvas.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      //canvas.textAlign = "right";
    } else {
      canvas.fillText(title, drawingRect.left, drawingRect.top);
    }
  }

  setEventDrawingRectangle(channelPosition, start, end, drawingRect) {
    drawingRect.left = this.getXFrom(start);
    drawingRect.top = this.getTopFrom(channelPosition);
    drawingRect.right = this.getXFrom(end) - this.mChannelLayoutMargin;
    drawingRect.bottom = drawingRect.top + this.mChannelLayoutHeight;

    return drawingRect;
  }

  drawChannelListItems(canvas, drawingRect) {
    // Background
    this.mMeasuringRect.left = this.getScrollX();
    this.mMeasuringRect.top = this.getScrollY();
    this.mMeasuringRect.right = drawingRect.left + this.mChannelLayoutWidth;
    this.mMeasuringRect.bottom = this.mMeasuringRect.top + this.getHeight();

    //mPaint.setColor(mChannelLayoutBackground);
    canvas.fillStyle = this.mChannelLayoutBackground;
    canvas.fillRect(
      this.mMeasuringRect.left,
      this.mMeasuringRect.top,
      this.mMeasuringRect.width,
      this.mMeasuringRect.height,
    );

    let firstPos = this.getFirstVisibleChannelPosition();
    let lastPos = this.getLastVisibleChannelPosition();

    for (let pos = firstPos; pos <= lastPos; pos++) {
      this.drawChannelItem(canvas, pos, drawingRect);
    }
  }

  drawChannelItem(canvas, position, drawingRect) {
    drawingRect.left = this.getScrollX();
    drawingRect.top = this.getTopFrom(position);
    drawingRect.right = drawingRect.left + this.mChannelLayoutWidth;
    drawingRect.bottom = drawingRect.top + this.mChannelLayoutHeight;

    // Loading channel image into target for
    let imageURL = this.epgData.getChannel(position).icon;
    let name = this.epgData.getChannel(position).name;
    canvas.font = '12px Georgia';
    canvas.fillStyle = '#FFFFFF';
    canvas.fillText(`${name}.`, drawingRect.left + 3, drawingRect.top + 10);
    if (this.mChannelImageCache.has(imageURL)) {
      let image = this.mChannelImageCache.get(imageURL);
      drawingRect = this.getDrawingRectForChannelImage(drawingRect, image);
      //canvas.drawBitmap(image, null, drawingRect, null);
      if (this.isRTL()) {
        canvas.setTransform(1, 0, 0, 1, 0, 0);
        canvas.drawImage(
          image,
          this.getWidth() +
            4 * this.mChannelLayoutMargin -
            this.mChannelLayoutWidth -
            drawingRect.left,
          drawingRect.top,
          drawingRect.width,
          drawingRect.height,
        );
        canvas.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      } else {
        canvas.drawImage(
          image,
          drawingRect.left,
          drawingRect.top,
          drawingRect.width,
          drawingRect.height,
        );
      }
    } else {
      this.epgUtils.fetImage(imageURL, (data) => {
        const image = new CanvasImage(this.canvasRe.current);
        image.src = data;
        this.mChannelImageCache.set(imageURL, image);
        this.updateCanvas();
      });
    }
  }

  getDrawingRectForChannelImage(drawingRect, image) {
    drawingRect.left += this.mChannelLayoutPadding;
    drawingRect.top += this.mChannelLayoutPadding;
    drawingRect.right -= this.mChannelLayoutPadding;
    drawingRect.bottom -= this.mChannelLayoutPadding;

    let imageWidth = image.width;
    let imageHeight = image.height;
    let imageRatio = imageHeight / parseFloat(imageWidth);

    let rectWidth = drawingRect.right - drawingRect.left;
    let rectHeight = drawingRect.bottom - drawingRect.top;

    // Keep aspect ratio.
    if (imageWidth > imageHeight) {
      let padding = parseInt((rectHeight - rectWidth * imageRatio) / 2);
      drawingRect.top += padding;
      drawingRect.bottom -= padding;
    } else if (imageWidth <= imageHeight) {
      let padding = parseInt((rectWidth - rectHeight / imageRatio) / 2);
      drawingRect.left += padding;
      drawingRect.right -= padding;
    }

    return drawingRect;
  }

  drawFocusEvent(canvas, drawingRect) {}

  handleClick(event) {
    // this.scrollX =
    //   this.getScrollX(false) +
    //   parseInt(TIME_LABEL_SPACING_MILLIS / this.mMillisPerPixel);
    // //this.scroller.scrollTo(this.scrollX, this.scrollY);
    // //window.scrollTo(this.scrollX, this.scrollY);
    // //this.ctx.fillStyle = 'red';
    // this.ctx.clearRect(0, 0, this.getWidth(), this.getHeight());
    // this.clear();
    // this.onDraw(this.ctx);
    //this.updateCanvas();
  }

  clear() {
    this.mClipRect = new Rect();
    this.mDrawingRect = new Rect();
    this.mMeasuringRect = new Rect();
  }

  recalculateAndRedraw(withAnimation) {
    if (this.epgData != null && this.epgData.hasData()) {
      this.resetBoundaries();

      this.calculateMaxVerticalScroll();
      this.calculateMaxHorizontalScroll();

      this.scrollX =
        this.getScrollX() + this.getXPositionStart() - this.getScrollX();
      this.scrollY = this.getScrollY();
      this.scroller = this.containCanvas.current;
      this.updateCanvas();
    }
  }

  handleScroll() {
    console.log('scrolling...');
  }

  // handleKeyPress(event) {
  //   let keyCode = event.keyCode;
  //   /*keyCode = this.isRTL() && (keyCode == 39) ? 37 : 39;
  //       keyCode = this.isRTL() && (keyCode == 37) ? 39 : 37;*/
  //   let programPosition = this.getFocusedEventPosition();
  //   let channelPosition = this.getFocusedChannelPosition();
  //   let dx = 0,
  //     dy = 0;
  //   switch (keyCode) {
  //     case 39:
  //       //let programPosition = this.getProgramPosition(this.getFocusedChannelPosition(), this.getTimeFrom(this.getScrollX(false) ));
  //       programPosition += 1;
  //       if (
  //         programPosition != -1 &&
  //         programPosition <
  //           this.epgData.getEventCount(this.getFocusedChannelPosition())
  //       ) {
  //         this.focusedEvent = this.epgData.getEvent(
  //           this.getFocusedChannelPosition(),
  //           programPosition,
  //         );
  //         if (this.focusedEvent) {
  //           this.focusedEventPosition = programPosition;
  //           dx = parseInt(
  //             (this.focusedEvent.getEnd() - this.focusedEvent.getStart()) /
  //               this.mMillisPerPixel,
  //           );
  //         }
  //       }
  //       this.scrollX = this.getScrollX(false) + dx;
  //       break;
  //     case 37:
  //       programPosition -= 1;
  //       if (programPosition != -1 && programPosition > -1) {
  //         this.focusedEvent = this.epgData.getEvent(
  //           this.getFocusedChannelPosition(),
  //           programPosition,
  //         );
  //         if (this.focusedEvent) {
  //           this.focusedEventPosition = programPosition;
  //           dx =
  //             -1 *
  //             parseInt(
  //               (this.focusedEvent.getEnd() - this.focusedEvent.getStart()) /
  //                 this.mMillisPerPixel,
  //             );
  //         }
  //       }
  //       this.scrollX = this.getScrollX(false) + dx;
  //       break;
  //     case 40:
  //       channelPosition += 1;
  //       if (channelPosition < this.epgData.getChannelCount()) {
  //         dy = this.mChannelLayoutHeight + this.mChannelLayoutMargin;
  //         this.focusedEventPosition = this.getProgramPosition(
  //           channelPosition,
  //           this.getTimeFrom(this.getScrollX(false) + this.getWidth() / 2),
  //         );

  //         if (
  //           channelPosition >
  //           VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
  //         ) {
  //           if (
  //             channelPosition !=
  //             this.epgData.getChannelCount() -
  //               VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
  //           ) {
  //             this.scrollY = this.getScrollY(false) + dy;
  //           }
  //         }
  //         console.log(channelPosition);
  //         this.focusedChannelPosition = channelPosition;
  //       }
  //       break;
  //     case 38:
  //       channelPosition -= 1;
  //       if (channelPosition >= 0) {
  //         dy = -1 * (this.mChannelLayoutHeight + this.mChannelLayoutMargin);
  //         this.focusedEventPosition = this.getProgramPosition(
  //           channelPosition,
  //           this.getTimeFrom(this.getScrollX(false) + this.getWidth() / 2),
  //         );
  //         if (
  //           channelPosition >=
  //           VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
  //         ) {
  //           if (
  //             this.epgData.getChannelCount() - channelPosition !=
  //             VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
  //           ) {
  //             this.scrollY = this.getScrollY(false) + dy;
  //           }
  //         }
  //         console.log(channelPosition);
  //         this.focusedChannelPosition = channelPosition;
  //       }
  //       break;
  //   }

  //   this.ctx.clearRect(0, 0, this.getWidth(), this.getHeight());
  //   this.clear();
  //   this.onDraw(this.ctx);
  // }

  componentDidMount() {
    //this.updateCanvas();
    this.canvasRe.current.width = this.getWidth();
    this.canvasRe.current.height = this.getHeight();
    this._enableTVEventHandler();
    this.recalculateAndRedraw(false);
    this.focusEPG();
  }

  componentDidUpdate() {
    this.updateCanvas();
  }

  shouldComponentUpdate() {
    return this.epgData.length > 0;
  }

  componentWillUnmount() {
    this._disableTVEventHandler();
  }

  updateCanvas() {
    this.ctx = this.canvasRe.current.getContext('2d');
    if (this.isRTL()) {
      //this.ctx.scale(-1,1);
      //this.ctx.translate(this.getWidth(), 0);
      this.ctx.setTransform(-1, -0, 0, 1, this.getWidth(), 0);
      //this.ctx.setTransform(-1,-0,0,1,this.getWidth(),0);

      // WORKING
      /*this.ctx.setTransform(1,0,0,1,0,0);
            this.ctx.translate(this.getWidth(),0);
            this.ctx.scale(-1,1);*/
      //console.log(this.ctx.currentTransform);
      //this.ctx.rotate(360*Math.PI/180);
      //console.log(this.ctx.currentTransform);
    }
    // draw children “components”
    this.onDraw(this.ctx);
  }

  focusEPG() {
    this.epgParent.current.focus();
  }
  handleCanvas(canvas) {
    console.log('new initial');
    this.canvasRe.current = canvas;
  }

  _enableTVEventHandler = () => {
    var _scope = this;
    this._tvEventHandler.enable(this, function (cmp, evt) {
      if (evt.eventKeyAction > 0 || _scope.loading) {
        return;
      }
      const dat = Date.now();
      console.log('event - 0');
      _scope.loading = true;
      let programPosition = _scope.getFocusedEventPosition();
      let channelPosition = _scope.getFocusedChannelPosition();
      let dx = 0,
        dy = 0,
        loadmore = false;

      if (evt && evt.eventType === 'right') {
        programPosition += 1;
        const countprogs = _scope.epgData.getEventCount(
          _scope.getFocusedChannelPosition(),
        );
        if (programPosition != -1 && programPosition < countprogs) {
          _scope.focusedEvent = _scope.epgData.getEvent(
            _scope.getFocusedChannelPosition(),
            programPosition,
          );
          if (_scope.focusedEvent) {
            _scope.focusedEventPosition = programPosition;
            dx = parseInt(
              (_scope.focusedEvent.end - _scope.focusedEvent.start) /
                _scope.mMillisPerPixel,
            );
            if (programPosition > countprogs - 10) {
              loadmore = true;
            }
          }
        }
        _scope.scrollX = _scope.getScrollX(false) + dx;
      } else if (evt && evt.eventType === 'up') {
        channelPosition -= 1;
        if (channelPosition >= 0) {
          dy = -1 * (_scope.mChannelLayoutHeight + _scope.mChannelLayoutMargin);
          _scope.focusedEventPosition = _scope.getProgramPosition(
            channelPosition,
            _scope.getTimeFrom(
              _scope.getScrollX(false) + _scope.getWidth() / 2,
            ),
          );
          if (
            channelPosition >=
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              _scope.epgData.getChannelCount() - channelPosition !=
              VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              _scope.scrollY = _scope.getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          _scope.focusedChannelPosition = channelPosition;
        }
      } else if (evt && evt.eventType === 'left') {
        programPosition -= 1;
        if (programPosition != -1 && programPosition > -1) {
          _scope.focusedEvent = _scope.epgData.getEvent(
            _scope.getFocusedChannelPosition(),
            programPosition,
          );
          if (_scope.focusedEvent) {
            console.log(
              moment(_scope.focusedEvent.start).format('YYYY-MM-DD HH:mm'),
            );
            _scope.focusedEventPosition = programPosition;
            dx =
              -1 *
              parseInt(
                (_scope.focusedEvent.end - _scope.focusedEvent.start) /
                  _scope.mMillisPerPixel,
              );
          }
        }
        _scope.scrollX = _scope.getScrollX(false) + dx;
      } else if (evt && evt.eventType === 'down') {
        channelPosition += 1;
        if (channelPosition < _scope.epgData.getChannelCount()) {
          dy = _scope.mChannelLayoutHeight + _scope.mChannelLayoutMargin;
          _scope.focusedEventPosition = _scope.getProgramPosition(
            channelPosition,
            _scope.getTimeFrom(
              _scope.getScrollX(false) + _scope.getWidth() / 2,
            ),
          );

          if (
            channelPosition >
            VISIBLE_CHANNEL_COUNT - VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
          ) {
            if (
              channelPosition !=
              _scope.epgData.getChannelCount() -
                VERTICAL_SCROLL_BOTTOM_PADDING_ITEM
            ) {
              _scope.scrollY = _scope.getScrollY(false) + dy;
            }
          }
          console.log(channelPosition);
          _scope.focusedChannelPosition = channelPosition;
        }
      }
      _scope.ctx.clearRect(0, 0, _scope.getWidth(), _scope.getHeight());
      _scope.clear();
      _scope.onDraw(
        _scope.ctx,
        evt.eventType === 'left' || evt.eventType === 'right',
      );
      console.log('event end', Date.now() - dat);
      if (loadmore && _scope.epgData.page < _scope.page + 1) {
        _scope.epgData.getMoreEvent(_scope.page + 1);
        _scope.page += 1;
      }

      _scope.loading = false;
    });
  };

  _disableTVEventHandler = () => {
    if (this._tvEventHandler) {
      this._tvEventHandler.disable();
    }
  };

  getCotainer = (e) => {
    this.containCanvas.current = e;
  };

  getViewEpg = (e) => {
    this.epgParent.current = e;
  };

  render() {
    return (
      <View
        id="wrapper"
        style={{ width: '100%', height: '100%' }}
        ref={this.getViewEpg}
        className={Styles.background}
      >
        <View
          ref={this.getCotainer}
          style={{ width: '100%', backgroundColor: 'green', height: '100%' }}
        >
          <Canvas
            ref={this.handleCanvas}
            width={width}
            height={height}
            style={{ border: 1 }}
          />
        </View>
      </View>
    );
  }
}

const Styles = StyleSheet.create({
  background: {
    backgroundColor: '#0f0',
    flex: 1,
    elevation: 1,
    position: 'absolute',
    width: 1280,
    maxHeight: 720,
    top: 20,
    left: 20,
    right: 'initial',
    opacity: 0.99,
  },
});
