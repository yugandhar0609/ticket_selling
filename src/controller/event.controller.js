const EventService = require('../services/event.service');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status');

const getAllEvents = catchAsync(async (req, res) => {
  const events = await EventService.getAllEvents();
  res.status(httpStatus.OK).json({
    success: true,
    data: events
  });
});

const getEventById = catchAsync(async (req, res) => {
  const event = await EventService.getEventById(req.params.id);
  res.status(httpStatus.OK).json({
    success: true,
    data: event
  });
});

const createEvent = catchAsync(async (req, res) => {
  const event = await EventService.createEvent(req.body);
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Event created successfully',
    data: event
  });
});

const getEventAvailability = catchAsync(async (req, res) => {
  const availability = await EventService.getEventAvailability(req.params.id);
  res.status(httpStatus.OK).json({
    success: true,
    data: availability
  });
});

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  getEventAvailability
}; 