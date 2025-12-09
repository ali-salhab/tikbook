const AppVersion = require("../models/AppVersion");

// @desc    Create new app version
// @route   POST /api/versions
// @access  Private/Admin
const createVersion = async (req, res) => {
  try {
    const { version, platform, priority, url, description, isActive } =
      req.body;

    const newVersion = await AppVersion.create({
      version,
      platform,
      priority,
      url,
      description,
      isActive,
    });

    res.status(201).json(newVersion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get latest app version
// @route   GET /api/versions/latest
// @access  Public
const getLatestVersion = async (req, res) => {
  try {
    const { platform } = req.query;
    const query = { isActive: true };

    if (platform) {
      query.platform = platform;
    }

    const latestVersion = await AppVersion.findOne(query).sort({
      createdAt: -1,
    });

    if (latestVersion) {
      res.json(latestVersion);
    } else {
      res.status(404).json({ message: "No version found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all app versions
// @route   GET /api/versions
// @access  Private/Admin
const getVersions = async (req, res) => {
  try {
    const versions = await AppVersion.find({}).sort({ createdAt: -1 });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update app version
// @route   PUT /api/versions/:id
// @access  Private/Admin
const updateVersion = async (req, res) => {
  try {
    const version = await AppVersion.findById(req.params.id);

    if (version) {
      version.version = req.body.version || version.version;
      version.platform = req.body.platform || version.platform;
      version.priority = req.body.priority || version.priority;
      version.url = req.body.url || version.url;
      version.description = req.body.description || version.description;
      version.isActive =
        req.body.isActive !== undefined ? req.body.isActive : version.isActive;

      const updatedVersion = await version.save();
      res.json(updatedVersion);
    } else {
      res.status(404).json({ message: "Version not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete app version
// @route   DELETE /api/versions/:id
// @access  Private/Admin
const deleteVersion = async (req, res) => {
  try {
    const version = await AppVersion.findById(req.params.id);

    if (version) {
      await version.deleteOne();
      res.json({ message: "Version removed" });
    } else {
      res.status(404).json({ message: "Version not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createVersion,
  getLatestVersion,
  getVersions,
  updateVersion,
  deleteVersion,
};
