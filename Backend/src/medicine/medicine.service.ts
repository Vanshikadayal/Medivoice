import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Medicine,
  MedicineFrequency,
} from './schemas/medicine.schema';
import { Prescription } from '../prescription/schemas/prescription.schema';
import { ReminderService } from '../reminder/reminder.service';

type CreateMedicineDto = {
  prescriptionId: string;
  name: string;
  dosage?: string;
  frequency: MedicineFrequency;
  dosesPerDay: number;
  durationDays?: number | null;
  startDate?: string | Date;
  instructions?: string;
};

type UpdateMedicineDto = {
  name?: string;
  dosage?: string;
  frequency?: MedicineFrequency;
  dosesPerDay?: number;
  durationDays?: number;
  startDate?: string | Date;
  instructions?: string;
};

@Injectable()
export class MedicineService {
  constructor(
    @InjectModel(Medicine.name) private medicineModel: Model<Medicine>,
    @InjectModel(Prescription.name)
    private prescriptionModel: Model<Prescription>,
    @Inject(forwardRef(() => ReminderService))
    private readonly reminderService: ReminderService,
  ) {}

  async create(userId: string, createMedicineDto: CreateMedicineDto) {
    await this.assertPrescriptionOwnedByUser(
      userId,
      createMedicineDto.prescriptionId,
    );

    const medicine = await this.medicineModel.create({
      userId: this.toUserObjectId(userId),
      prescriptionId: new Types.ObjectId(createMedicineDto.prescriptionId),
      name: createMedicineDto.name,
      dosage: createMedicineDto.dosage?.trim() ?? '',
      frequency: createMedicineDto.frequency,
      dosesPerDay: createMedicineDto.dosesPerDay,
      durationDays:
        createMedicineDto.durationDays !== undefined &&
        createMedicineDto.durationDays !== null
          ? createMedicineDto.durationDays
          : null,
      startDate: this.toStartOfDay(createMedicineDto.startDate),
      instructions: createMedicineDto.instructions,
    });

    await this.reminderService.generateRemindersForMedicine(
      userId,
      medicine._id.toString(),
    );

    return medicine;
  }

  async createMany(userId: string, medicines: CreateMedicineDto[]) {
    const prescriptionIds = [
      ...new Set(medicines.map((medicine) => medicine.prescriptionId)),
    ];

    for (const prescriptionId of prescriptionIds) {
      await this.assertPrescriptionOwnedByUser(userId, prescriptionId);
    }

    const created = await this.medicineModel.insertMany(
      medicines.map((medicine) => ({
        userId: this.toUserObjectId(userId),
        prescriptionId: new Types.ObjectId(medicine.prescriptionId),
        name: medicine.name,
        dosage: medicine.dosage?.trim() ?? '',
        frequency: medicine.frequency,
        dosesPerDay: medicine.dosesPerDay,
        durationDays:
          medicine.durationDays !== undefined && medicine.durationDays !== null
            ? medicine.durationDays
            : null,
        startDate: this.toStartOfDay(medicine.startDate),
        instructions: medicine.instructions,
      })),
    );

    for (const prescriptionId of prescriptionIds) {
      await this.reminderService.generateRemindersForPrescription(
        userId,
        prescriptionId,
      );
    }

    return created;
  }

  async findAllByUser(userId: string) {
    return this.medicineModel
      .find({ userId: this.toUserObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async findByPrescription(userId: string, prescriptionId: string) {
    await this.assertPrescriptionOwnedByUser(userId, prescriptionId);

    return this.medicineModel
      .find({
        userId: this.toUserObjectId(userId),
        prescriptionId: this.toObjectId(prescriptionId, 'Prescription not found'),
      })
      .sort({ createdAt: -1 });
  }

  async findOne(userId: string, medicineId: string) {
    const medicine = await this.medicineModel.findOne({
      _id: this.toObjectId(medicineId, 'Medicine not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    return medicine;
  }

  async update(
    userId: string,
    medicineId: string,
    updateMedicineDto: UpdateMedicineDto,
  ) {
    const shouldRegenerateReminders =
      updateMedicineDto.durationDays !== undefined ||
      updateMedicineDto.dosesPerDay !== undefined ||
      updateMedicineDto.startDate !== undefined;

    const medicine = await this.medicineModel.findOneAndUpdate(
      {
        _id: this.toObjectId(medicineId, 'Medicine not found'),
        userId: this.toUserObjectId(userId),
      },
      {
        $set: {
          ...(updateMedicineDto.name !== undefined && {
            name: updateMedicineDto.name,
          }),
          ...(updateMedicineDto.dosage !== undefined && {
            dosage: updateMedicineDto.dosage,
          }),
          ...(updateMedicineDto.frequency !== undefined && {
            frequency: updateMedicineDto.frequency,
          }),
          ...(updateMedicineDto.dosesPerDay !== undefined && {
            dosesPerDay: updateMedicineDto.dosesPerDay,
          }),
          ...(updateMedicineDto.durationDays !== undefined && {
            durationDays: updateMedicineDto.durationDays,
          }),
          ...(updateMedicineDto.startDate !== undefined && {
            startDate: this.toStartOfDay(updateMedicineDto.startDate),
          }),
          ...(updateMedicineDto.instructions !== undefined && {
            instructions: updateMedicineDto.instructions,
          }),
        },
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    if (shouldRegenerateReminders) {
      await this.reminderService.generateRemindersForMedicine(
        userId,
        medicineId,
      );
    }

    return medicine;
  }

  async remove(userId: string, medicineId: string) {
    const medicine = await this.medicineModel.findOneAndDelete({
      _id: this.toObjectId(medicineId, 'Medicine not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    await this.reminderService.deleteFuturePendingRemindersForMedicine(
      userId,
      medicineId,
    );

    return medicine;
  }

  private toStartOfDay(value?: string | Date) {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toUserObjectId(userId: string | Types.ObjectId): Types.ObjectId {
    if (userId instanceof Types.ObjectId) {
      return userId;
    }
    const raw = String(userId ?? '').trim();
    const hex = raw.match(/[a-f0-9]{24}/i)?.[0];
    if (!hex) {
      throw new NotFoundException('User not found');
    }
    return new Types.ObjectId(hex);
  }

  private async assertPrescriptionOwnedByUser(
    userId: string,
    prescriptionId: string,
  ) {
    const prescription = await this.prescriptionModel.findOne({
      _id: this.toObjectId(prescriptionId, 'Prescription not found'),
      userId: this.toUserObjectId(userId),
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  private toObjectId(id: string, notFoundMessage: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(notFoundMessage);
    }

    return new Types.ObjectId(id);
  }
}
