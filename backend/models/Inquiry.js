/** Website contact-form records remain independent of the optional support module. */
import mongoose from 'mongoose';
export const Inquiry = mongoose.models.WebsiteInquiry || mongoose.model('WebsiteInquiry',
  new mongoose.Schema({}, { strict: false, timestamps: true }));
