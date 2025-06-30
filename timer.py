#######################################################################################
# timer.py       Version 1.0     21-Mar-2025
# Trevor Ritchie, Taj Ballinger, and Bill Manaris
#
#######################################################################################
#
# [LICENSING GOES HERE]
#
#######################################################################################
#
# Timer class for scheduling tasks to run or repeat at fixed time intervals.
#
# TIMER ACCURACY:
# - This timer achieves high accuracy through a dedicated ticker thread
# - Time measurement is based on actual elapsed time, not just sleep intervals
# - The implementation handles timing drift by tracking accumulated time precisely
# - Callbacks are scheduled based on actual elapsed time, not fixed wall-clock intervals
#
#######################################################################################

############### IMPORTS ###############################################################

import threading, time, atexit

# define what gets exported when using 'from timer import *'
__all__ = ['Timer']

############### SETUP #################################################################
# To work around the limitation that we can't easily schedule callbacks at specific times,
# we create a ticker thread that wakes up at short intervals to check if any timers
# need to be triggered.
#
# ACCURACY ADVANTAGES:
# 1. Running in a separate thread means timing isn't affected by operations in the main thread
# 2. Measuring actual elapsed time (dt) compensates for any processing delays
# 3. Accumulating precise time values prevents long-term drift
#
# Timers are added to _ACTIVE_TIMERS when they start, and removed when they stop
# or, if they are oneshots, when they call their callback function.

# global ticker thread that calls timer callbacks
def _tickerThread():
   """Internal function that periodically updates all active timers.

   This function runs in a separate thread and wakes up at regular intervals
   to call the _tick method of all active timers. It measures the actual time
   elapsed between calls to ensure timing accuracy.
   """
   lastTime = time.time()
   while _tickerRunning:
      currentTime = time.time()
      dt = currentTime - lastTime  # measure actual elapsed time between ticks
      lastTime = currentTime

      # call tick for all active timers with the precise time difference
      for timer in list(_activeTimers):
         timer._tick(dt)

      # sleep for a short time (adjust as needed for precision)
      time.sleep(0.01)  # 10ms resolution - balances CPU usage with timing precision

_initialized = False
# if this is the first time loading this module, initialize global variables
if not _initialized:
   _initialized = True
   _activeTimers = []
   _tickerRunning = True

   # allow Python to exit even if thread is running
   _ticker = threading.Thread(target=_tickerThread, daemon=True)
   # start ticker thread
   _ticker.start()

   # Note: We don't need a blocking thread when using python -i,
   # since the interpreter stays open already

   # register cleanup on exit
   def _cleanup():
      """Cleans up all active timers when the program exits.

      This function is registered with atexit to ensure proper cleanup
      even if the program terminates unexpectedly.
      """
      global _tickerRunning
      _tickerRunning = False

      # stop all active timers
      for timer in list(_activeTimers):
         timer.stop()

   atexit.register(_cleanup)

##########################################################################
# Timer
#
# Class for creating a timer (for use to schedule tasks to be executed after
# a given time interval, repeatedly or once).
#
# Methods:
#
# Timer(timeInterval, function, parameters, repeat)
#   Creates a new Timer to call 'function' with 'parameters', after 'timeInterval' (if 'repeat'
#   is True this will go on indefinitely (default); False means once.
#   It uses either Swing's Timer.
#
# start()
#   Starts the timer.
#
# stop()
#   Stops the timer.
#
# isRunning()
#   Returns True if timer is running; False otherwise.
#
# stop()
#   Stops the timer.
#
# setRepeats( flag )
#   Sets the repeat attribute of the timer (True means repeat; False means once).
#####################################################################################

class Timer():
   """Timer used to schedule tasks to be run at fixed time intervals."""


   def __init__(self, timeInterval, function, parameters=[], repeat=True):
      """Specify time interval (in milliseconds), which function to call when the time interval has passed
         and the parameters to pass this function, and whether to repeat (True) or do it only once."""
      self._interval = timeInterval / 1000.0   # convert ms to seconds to work with Python's Time module
      self._function = function                # callback function to execute
      self._parameters = parameters            # parameters to pass to the callback function
      self._repeat = repeat                    # whether to repeat the timer or run once
      self._scheduled = False                  # flag indicating if timer is scheduled
      self._accumulatedTime = 0                # tracks elapsed time since last execution
      self._running = False                    # flag indicating if timer is currently running

   def __str__(self):
      return f"Timer: {self.getDelay()} ms, repeat: {self.getRepeat()}"

   def __repr__(self):
      return str(self)

   def _tick(self, dt):
      """Internal method called by the ticker thread to update timer state."""
      if not self._running:
         return

      # accumulate the actual elapsed time with high precision
      self._accumulatedTime += dt

      # check if it's time to run the callback
      if self._accumulatedTime >= self._interval:
         # call the function
         self._function(*self._parameters)

         # reset accumulated time, accounting for overshooting
         if self._repeat:
            # DRIFT PREVENTION: subtract exactly one interval, preserving any excess time
            # this is critical for preventing long-term drift in repeated timers
            self._accumulatedTime -= self._interval
         else:
            # for one-shot timers, remove from active timers
            self.stop()

   def start(self):
      """Creates a timer task to perform the desired task as specified (in terms of timeInterval and repeat)."""
      # check if timer is not already running
      if not self._running:
         self._running = True         # set running flag to true
         self._accumulatedTime = 0    # reset accumulated time
         _activeTimers.append(self)   # add this timer to the active timers list

   def stop(self):
      """Stops scheduled task from executing."""
      # check if timer is currently running
      if self._running:
         self._running = False         # set running flag to false
         # remove this timer from the active timers list if it exists
         if self in _activeTimers:
            _activeTimers.remove(self)

   def getDelay(self):
      """Returns the delay time interval (in milliseconds)."""
      return self._interval * 1000   # convert back to ms for API consistency

   def setDelay(self, timeInterval):
      """
      Sets a new delay time interval for timer t (in milliseconds).
         This allows to change the speed of the animation, after some event occurs..
      """
      self._interval = timeInterval / 1000.0

      # if running, restart with new interval
      if self.isRunning():
         self.stop()
         self.start()

   def isRunning(self):
      """Returns True if timer is still running, False otherwise."""
      return self._running

   def setFunction(self, function, parameters=[]):
      """Sets the function to execute.  The optional parameter parameters is a list of parameters to pass to the function (when called)."""
      self._function = function
      self._parameters = parameters

   def getRepeat(self):
      """Returns True if timer is set to repeat, False otherwise."""
      return self._repeat

   def setRepeat(self, repeat):
      """Timer is set to repeat if flag is True, and not to repeat if flag is False."""
      self._repeat = repeat

   # linear ramp function
   @staticmethod
   def linearRamp(delayMs, startValue, endValue, callbackFunc, stepMs=10):
      """
      Starts a linear ramp in a separate thread.

      Args:
         delayMs (float): Total duration of the ramp in milliseconds.
         startValue (float): The value at the beginning of the ramp.
         endValue (float): The value at the end of the ramp.
         callbackFunc (callable): Function to call at each step.
                                    It receives one argument: the current ramp value.
         stepMs (float, optional): Approximate time in milliseconds between callbacks.
                                    Defaults to 10ms.
      """
      if not callable(callbackFunc):
         print("Timer.startLinearRamp: Error - callbackFunc must be callable.")
         return

      if stepMs <= 0:
         stepMs = 10

      thread = threading.Thread(
         target=Timer._linearRampThreadTarget, # Call the static method via Timer class
         args=(delayMs, startValue, endValue, callbackFunc, stepMs),
         daemon=True
      )
      thread.start()

   @staticmethod
   def _linearRampThreadTarget(delayMs, startValue, endValue, callbackFunc, stepMs):
      """Internal static target function for the ramp thread."""
      if delayMs <= 0:
         callbackFunc(endValue)
         return

      numSteps = max(1, int(round(delayMs / stepMs)))
      if numSteps == 1 and delayMs > 0:
         actualStepDurationS = delayMs / 1000.0
      elif numSteps > 1:
         actualStepDurationS = (delayMs / 1000.0) / numSteps
      else:
         callbackFunc(endValue)
         return

      for i in range(numSteps):
         progress = float(i) / numSteps
         currentValue = startValue + (endValue - startValue) * progress
         callbackFunc(currentValue)
         time.sleep(actualStepDurationS)

      callbackFunc(endValue)


#######################################################################################
#### Test #############################################################################
#######################################################################################

if __name__ == '__main__':
   seconds = 0
   startTime = time.time()

   def echoTime():
      global seconds
      current = seconds
      seconds += 1
      print(f"Timed Seconds: {current+1}, Actual Seconds: {time.time()-startTime:.3f}")

   # define timer to count and output elapsed time (in seconds)
   t = Timer(1000, echoTime, [], True)
   t.start()
