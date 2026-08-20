import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prescription } from './schemas/prescription.schema';
import {
  PrescriptionExtractionSnapshot,
  PrescriptionStatus,
} from './types/prescription-status';

type CreatePrescriptionDto = {
  imageUrl?: string;
  extractedText?: string;
  doctorName?: string;
  patientName?: string;
  prescriptionDate?: Date;
  status?: PrescriptionStatus;
};

type UpdatePrescriptionDto = {
  imageUrl?: string;
  extractedText?: string;
  doctorName?: string;
  patientName?: string;
  prescriptionDate?: Date;
  status?: PrescriptionStatus;
  extractionResult?: PrescriptionExtractionSnapshot | null;
};

@Injectable()
export class PrescriptionService {
  constructor(
    @InjectModel(Prescription.name)
    private prescriptionModel: Model<Prescription>,
  ) {}

  async create(userId: string, createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionModel.create({
      userId: new Types.ObjectId(userId),
      imageUrl: createPrescriptionDto.imageUrl,
      extractedText: createPrescriptionDto.extractedText,
      doctorName: createPrescriptionDto.doctorName,
      patientName: createPrescriptionDto.patientName,
      prescriptionDate: createPrescriptionDto.prescriptionDate,
      status: createPrescriptionDto.status ?? PrescriptionStatus.UPLOADED,
    });
  }

  async createFromUpload(userId: string, imageUrl: string) {
    return this.prescriptionModel.create({
      userId: new Types.ObjectId(userId),
      imageUrl,
      extractedText: '',
      status: PrescriptionStatus.UPLOADED,
      extractionResult: null,
    });
  }

  async findAllByUser(userId: string) {
    return this.prescriptionModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findOne(userId: string, prescriptionId: string) {
    const prescription = await this.prescriptionModel.findOne({
      _id: this.toObjectId(prescriptionId),
      userId,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async tryBeginConfirmation(userId: string, prescriptionId: string) {
    return this.prescriptionModel.findOneAndUpdate(
      {
        _id: this.toObjectId(prescriptionId),
        userId,
        status: PrescriptionStatus.REVIEW_REQUIRED,
      },
      { $set: { status: PrescriptionStatus.PROCESSING } },
      { returnDocument: 'after', runValidators: true },
    );
  }

  async update(
    userId: string,
    prescriptionId: string,
    updatePrescriptionDto: UpdatePrescriptionDto,
  ) {
    const prescription = await this.prescriptionModel.findOneAndUpdate(
      {
        _id: this.toObjectId(prescriptionId),
        userId,
      },
      {
        $set: {
          ...(updatePrescriptionDto.imageUrl !== undefined && {
            imageUrl: updatePrescriptionDto.imageUrl,
          }),
          ...(updatePrescriptionDto.extractedText !== undefined && {
            extractedText: updatePrescriptionDto.extractedText,
          }),
          ...(updatePrescriptionDto.doctorName !== undefined && {
            doctorName: updatePrescriptionDto.doctorName,
          }),
          ...(updatePrescriptionDto.patientName !== undefined && {
            patientName: updatePrescriptionDto.patientName,
          }),
          ...(updatePrescriptionDto.prescriptionDate !== undefined && {
            prescriptionDate: updatePrescriptionDto.prescriptionDate,
          }),
          ...(updatePrescriptionDto.status !== undefined && {
            status: updatePrescriptionDto.status,
          }),
          ...(updatePrescriptionDto.extractionResult !== undefined && {
            extractionResult: updatePrescriptionDto.extractionResult,
          }),
        },
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async remove(userId: string, prescriptionId: string) {
    const prescription = await this.prescriptionModel.findOneAndDelete({
      _id: this.toObjectId(prescriptionId),
      userId,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Prescription not found');
    }

    return new Types.ObjectId(id);
  }
}
