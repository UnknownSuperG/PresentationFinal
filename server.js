const express = require('express');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({ storage });

// MongoDB setup
const mongoURI = 'mongodb+srv://yuvamloonker:Yuvam2920@internship.p6qchsl.mongodb.net/internship?retryWrites=true&w=majority&appName=internship';
const dbName = 'premier_energies';
const collectionName = 'material_trials';

mongoose.connect(mongoURI).then(() => console.log('✅ Mongoose connected'))
  .catch(err => console.error('❌ Mongoose connection failed:', err));

const RequestSchema = new mongoose.Schema({
  date: String,
  category: String,
  details: String,
  supplier: String,
  quantity: Number,
  trial: String,
  purpose: String,
  purposeOther: String,
  bisRequired: Boolean,
  bisCost: Number,
  bisCostBy: String,
  iecRequired: Boolean,
  iecCost: Number,
  iecCostBy: String,
  status: { type: String, default: "Pending" },
  prNumber: String,
  materialCode: String,
  materialDescription: String,
  deliveryDate: String,
  remarks: String,
  deliveryFile: String,
  deliveryPerson: String,
  evaluationDate: String,
  evaluationReport: String,
  cmkRemarks: String,
  remarksAgainstOrder: String
}, { timestamps: true });

const Request = mongoose.model('Request', RequestSchema);

let nativeDB;

MongoClient.connect(mongoURI)
  .then(client => {
    console.log('✅ MongoClient connected');
    nativeDB = client.db(dbName);

    const collection = nativeDB.collection(collectionName);
    collection.countDocuments({ status: "Pending CMK Approval" }).then(count => {
      if (count === 0) {
        console.log("Inserting sample data...");
        collection.insertMany([
          {
            date: '',
            category: '',
            details: '',
            supplier: '',
            quantity: 25,
            trial: '',
            purpose: '',
            purposeOther: '',
            bisRequired: true,
            bisCost: null,
            bisCostBy: '',
            iecRequired: false,
            iecCost: null,
            iecCostBy: '',
            status: 'Pending CMK Approval',
            prNumber: '',
            materialCode: '',
            materialDescription: '',
            deliveryDate: '',
            remarks: '',
            deliveryFile: '',
            deliveryPerson: '',
            evaluationDate: '',
            evaluationReport: ''
          }
        ]);
      }
    });
  })
  .catch(error => {
    console.error('❌ MongoClient connection error:', error);
  });

// ----- Routes -----

app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request', details: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const filledRequest = {
      status: "Pending",
      prNumber: "",
      materialCode: "",
      materialDescription: "",
      deliveryDate: "",
      remarks: "",
      deliveryFile: "",
      deliveryPerson: "",
      evaluationDate: "",
      evaluationReport: "",
      ...req.body
    };

    const newRequest = new Request(filledRequest);
    const saved = await newRequest.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Failed to save request', details: err.message });
  }
});

app.put(['/api/requests/:id', '/api/trials/:id'], async (req, res) => {
  try {
    const allowedFields = [
      'date', 'category', 'details', 'supplier', 'quantity', 'trial', 'purpose', 'purposeOther',
      'bisRequired', 'bisCost', 'bisCostBy', 'iecRequired', 'iecCost', 'iecCostBy',
      'status', 'prNumber', 'materialCode', 'materialDescription', 'deliveryDate', 'remarks',
      'deliveryFile', 'deliveryPerson', 'evaluationDate', 'evaluationReport',
      'cmkRemarks', 'remarksAgainstOrder'
    ];

    const updateFields = {};
    for (const key of allowedFields) {
      if (req.body.hasOwnProperty(key)) {
        updateFields[key] = req.body[key];
      }
    }

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Request not found' });

    res.status(200).json({ message: `Request ${req.params.id} updated successfully.`, data: updated });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update request', details: err.message });
  }
});

app.post('/api/requests/upload/:id', upload.single('file'), async (req, res) => {
  try {
    const { deliveryPerson } = req.body;
    const deliveryFile = req.file?.filename;

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { $set: { deliveryPerson, deliveryFile, status: 'Delivered' } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Request not found' });

    res.status(200).json({ message: 'Upload successful', data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

app.post('/api/requests/evaluation/:id', upload.single('file'), async (req, res) => {
  try {
    const { evaluationDate } = req.body;
    const evaluationReport = req.file?.filename;

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { $set: { evaluationDate, evaluationReport, status: 'Received' } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Request not found' });

    res.status(200).json({ message: 'Evaluation submitted.', data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Evaluation upload failed', details: err.message });
  }
});

app.get('/api/trials', async (req, res) => {
  try {
    const trials = await nativeDB.collection(collectionName).find({}).toArray();
    res.json(trials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trials', error });
  }
});

// 🟢 Serve index.html for unmatched routes (Single Page App support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});