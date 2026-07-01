const binding = require('./binding')
const errors = require('./lib/errors')
const constants = require('./lib/constants')

exports.constants = constants
exports.errors = errors

exports.EOL = binding.platform === 'win32' ? '\r\n' : '\n'

exports.devNull = binding.platform === 'win32' ? '\\\\.\\nul' : '/dev/null'

exports.platform = function platform() {
  return binding.platform
}

exports.arch = function arch() {
  return binding.arch
}

exports.type = function type() {
  return binding.type()
}

exports.version = function version() {
  return binding.version()
}

exports.release = function release() {
  return binding.release()
}

exports.machine = function machine() {
  return binding.machine()
}

exports.execPath = function execPath() {
  return binding.execPath()
}

exports.pid = function pid() {
  return binding.pid()
}

exports.ppid = function ppid() {
  return binding.ppid()
}

exports.cwd = function cwd() {
  return binding.cwd()
}

exports.chdir = function chdir(dir) {
  validateString(dir, 'Directory')

  binding.chdir(dir)
}

exports.tmpdir = function tmpdir() {
  return binding.tmpdir()
}

exports.homedir = function homedir() {
  return binding.homedir()
}

exports.hostname = function hostname() {
  return binding.hostname()
}

exports.userInfo = function userInfo(uid) {
  if (uid !== undefined) validateInteger(uid, 'User ID')

  return binding.userInfo(uid)
}

exports.groupInfo = function groupInfo(gid) {
  if (gid !== undefined) validateInteger(gid, 'Group ID')

  return binding.groupInfo(gid)
}

exports.networkInterfaces = function networkInterfaces() {
  const result = {}

  for (const entry of binding.networkInterfaces()) {
    const { name, ...properties } = entry

    if (result[name]) result[name].push(properties)
    else result[name] = [properties]
  }

  return result
}

exports.kill = function kill(pid, signal = constants.signals.SIGTERM) {
  validateInteger(pid, 'Process ID')

  if (typeof signal === 'string') {
    if (signal in constants.signals === false) {
      throw errors.UNKNOWN_SIGNAL('Unknown signal: ' + signal)
    }

    signal = constants.signals[signal]
  } else {
    validateInteger(signal, 'Signal')
  }

  binding.kill(pid, signal)
}

exports.endianness = function endianness() {
  return binding.isLittleEndian ? 'LE' : 'BE'
}

exports.availableParallelism = function availableParallelism() {
  return binding.availableParallelism()
}

exports.cpuUsage = function cpuUsage(previous) {
  const current = binding.cpuUsage()

  if (previous) {
    return {
      user: current.user - previous.user,
      system: current.system - previous.system
    }
  }

  return current
}

exports.threadCpuUsage = function threadCpuUsage(previous) {
  const current = binding.threadCpuUsage()

  if (previous) {
    return {
      user: current.user - previous.user,
      system: current.system - previous.system
    }
  }

  return current
}

exports.resourceUsage = function resourceUsage() {
  return binding.resourceUsage()
}

exports.memoryUsage = function memoryUsage() {
  return binding.memoryUsage()
}

exports.freemem = function freemem() {
  return binding.freemem()
}

exports.totalmem = function totalmem() {
  return binding.totalmem()
}

exports.availableMemory = function availableMemory() {
  return binding.availableMemory()
}

exports.constrainedMemory = function constrainedMemory() {
  return binding.constrainedMemory()
}

exports.uptime = function uptime() {
  return binding.uptime()
}

exports.loadavg = function loadavg() {
  return binding.loadavg()
}

exports.cpus = function cpus() {
  return binding.cpus()
}

exports.getProcessTitle = function getProcessTitle() {
  return binding.getProcessTitle()
}

exports.setProcessTitle = function setProcessTitle(title) {
  if (typeof title !== 'string') title = title.toString()

  if (title.length >= 256) {
    throw errors.TITLE_OVERFLOW('Process title is too long')
  }

  binding.setProcessTitle(title)
}

exports.getPriority = function getPriority(pid = 0) {
  validateInteger(pid, 'Process ID')

  return binding.getPriority(pid)
}

exports.setPriority = function setPriority(pid, priority) {
  if (priority === undefined) {
    priority = pid
    pid = 0
  }

  validateInteger(pid, 'Process ID')
  validateInteger(priority, 'Priority')

  binding.setPriority(pid, priority)
}

exports.getEnvKeys = function getEnvKeys() {
  return binding.getEnvKeys()
}

exports.getEnv = function getEnv(name) {
  validateString(name, 'Name')

  return binding.getEnv(name)
}

exports.hasEnv = function hasEnv(name) {
  validateString(name, 'Name')

  return binding.hasEnv(name)
}

exports.setEnv = function setEnv(name, value) {
  validateString(name, 'Name')
  validateString(value, 'Value')

  binding.setEnv(name, value)
}

exports.unsetEnv = function unsetEnv(name) {
  validateString(name, 'Name')

  binding.unsetEnv(name)
}

function validateString(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string. Received type ${typeof value} (${value})`)
  }
}

function validateInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer. Received type ${typeof value} (${value})`)
  }
}
