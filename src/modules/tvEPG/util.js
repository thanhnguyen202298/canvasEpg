import { v4 as uuidv4 } from 'uuid';
const HALF_HOUR_TIME = 30 * 60 * 1000;

export const genHours = (time) => {
  let date = new Date(time);
  let dateEnd = new Date(time);
  date.setHours(0, 0, 0, 0);
  let timeStpCount = date.getTime();
  dateEnd.setHours(23, 59, 59, 999);
  const endOfDate = dateEnd.getTime();
  let listTime = [];

  while (timeStpCount < endOfDate) {
    const h = date.getHours();
    const m = date.getMinutes();
    listTime.push({
      start: date.getTime(),
      text: `${h}:${m === 0 ? '00' : m}`,
    });

    date.setMinutes(date.getMinutes() + 30);
    timeStpCount = date.getTime();
  }

  return listTime;
};

export const fillProgrames = (listChannelProgs, time) => {
  const today = new Date(time);
  today.setHours(0, 0, 0, 0);
  const startToday = today.getTime();
  today.setHours(23, 59, 59, 999);
  const endToday = today.getTime();

  let listChannelProccess = [...listChannelProgs];
  listChannelProccess = listChannelProgs.map((channel, index) => {
    const { programs } = channel;
    // if (programs && programs.length > 0) {
    //     const firstPro = programs[0];
    //     console.log('firstPro', firstPro)
    //     if (firstPro.startDate > startToday) {
    //         console.log('firstPro', firstPro)
    //         firstPro.startDate = today
    //     }
    // }

    let sortedListPrgs = programs.sort((a, b) => a?.startDate - b?.startDate);
    let tempList = [];
    const indexProgramPrevDay = sortedListPrgs.findIndex(
      (p) => p.startDate < startToday,
    );
    if (indexProgramPrevDay !== -1) {
      sortedListPrgs[indexProgramPrevDay].startDate = startToday;
    }

    const indexProgramNextDay = sortedListPrgs.findIndex(
      (p) => p.endDate > endToday,
    );
    if (indexProgramPrevDay !== -1) {
      console.log('indexProgramNextDay', indexProgramNextDay);
      sortedListPrgs[indexProgramNextDay].endDate = endToday;
    }

    for (let i = 0; i < sortedListPrgs.length - 1; i++) {
      const programItem = sortedListPrgs[i];
      if (programItem.id === -1) {
        const timeStartPro = programItem.startDate;
        const timeEndPro = programItem.endDate;
        const deltalTime = timeEndPro - timeStartPro;
        if (deltalTime > HALF_HOUR_TIME) {
          const multi =
            (deltalTime - (deltalTime % HALF_HOUR_TIME)) / HALF_HOUR_TIME;
          for (let j = 1; j <= multi; j++) {
            const endDatePrev =
              tempList.length > 0
                ? tempList[tempList.length - 1].endDate
                : timeStartPro;
            let prg = { ...programItem };
            prg.startDate = endDatePrev;
            prg.endDate = prg.startDate + HALF_HOUR_TIME;
            prg.start = prg.startDate;
            prg.end = prg.endDate;
            tempList.push(prg);
          }
          const endDateLast =
            tempList.length > 0
              ? tempList[tempList.length - 1].endDate
              : timeStartPro;
          if (timeEndPro - endDateLast > 0) {
            let prg = { ...programItem };
            prg.startDate = endDateLast;
            prg.endDate = timeEndPro;
            prg.start = prg.startDate;
            prg.end = prg.endDate;
            tempList.push(prg);
          }
        }
      }
    }

    // let prgsEnd = [];

    // if (programs && programs.length > 0) {
    //     const progamLastOfDay = programs[programs.length - 1];
    //     const timePrLast = progamLastOfDay.endDate;
    //     console.log('programs timePrLast', timePrLast, programs)
    //     if (timePrLast < endToday) {
    //         console.log('timePrLast endToday', timePrLast, endToday)

    //         const deltaTime = endToday - timePrLast;
    //         const multiEnd = deltaTime / HALF_HOUR_TIME;
    //         console.log('aaa multi', multiEnd)
    //         for (let t = 1; t <= multiEnd; j++) {
    //             const endDatePrev = (prgsEnd.length > 0) ? prgsEnd[prgsEnd.length - 1].endDate : timePrLast;
    //             let prg = { id: -1 };
    //             prg.startDate = endDatePrev;
    //             prg.endDate = prg.startDate + HALF_HOUR_TIME;
    //             prgsEnd.push(prg);
    //         }
    //         const endDateLastPr = (prgsEnd.length > 0) ? prgsEnd[prgsEnd.length - 1].endDate : timePrLast;
    //         if ((endToday - endDateLastPr) > 0) {
    //             let prg = { id: -1 };
    //             prg.startDate = endDateLastPr;
    //             prg.endDate = endToday;
    //             prgsEnd.push(prg);
    //         }
    //     }
    // }
    // console.log('prgsEnd', prgsEnd)

    const programHasInfo = sortedListPrgs.filter((item) => item.id !== -1);
    tempList = tempList.concat(programHasInfo);
    tempList.sort((a, b) => a?.startDate - b?.startDate);

    return {
      ...channel,
      events: tempList,
    };
  });

  return listChannelProccess;
};
