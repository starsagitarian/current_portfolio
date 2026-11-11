import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from "sequelize";

/** The site owner's headline details. The table holds exactly one row (id = 1). */
export class Profile extends Model<InferAttributes<Profile>, InferCreationAttributes<Profile>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare title: string;
  declare location: string;
  declare tagline: string;
  declare summary: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Tag extends Model<InferAttributes<Tag>, InferCreationAttributes<Tag>> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare label: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Technology extends Model<
  InferAttributes<Technology>,
  InferCreationAttributes<Technology>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Project extends Model<
  InferAttributes<Project, { omit: "tags" | "technologies" }>,
  InferCreationAttributes<Project, { omit: "tags" | "technologies" }>
> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare title: string;
  declare organisation: string | null;
  declare summary: string;
  declare body: string;
  declare repoUrl: string | null;
  declare liveUrl: string | null;
  declare coverImage: string | null;
  declare featured: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  /** Null means draft: not listed by the API. */
  declare publishedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare tags?: NonAttribute<Tag[]>;
  declare technologies?: NonAttribute<Technology[]>;
}

export class ProjectTag extends Model<
  InferAttributes<ProjectTag>,
  InferCreationAttributes<ProjectTag>
> {
  declare projectId: number;
  declare tagId: number;
}

export class ProjectTechnology extends Model<
  InferAttributes<ProjectTechnology>,
  InferCreationAttributes<ProjectTechnology>
> {
  declare projectId: number;
  declare technologyId: number;
  declare sortOrder: CreationOptional<number>;
}

export class Experience extends Model<
  InferAttributes<Experience>,
  InferCreationAttributes<Experience>
> {
  declare id: CreationOptional<number>;
  declare organisation: string;
  declare role: string;
  declare location: string;
  /** ISO dates (YYYY-MM-DD); the site shows month and year only. */
  declare startDate: string;
  declare endDate: string | null;
  declare highlights: CreationOptional<string[]>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Skill extends Model<InferAttributes<Skill>, InferCreationAttributes<Skill>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare category: string;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Certification extends Model<
  InferAttributes<Certification>,
  InferCreationAttributes<Certification>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare issuer: string;
  declare issuedOn: string;
  declare credentialUrl: string | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Education extends Model<
  InferAttributes<Education>,
  InferCreationAttributes<Education>
> {
  declare id: CreationOptional<number>;
  declare institution: string;
  declare qualification: string;
  declare location: string | null;
  declare endYear: number | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

const id = { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true } as const;
const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
} as const;
const sortOrder = { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } as const;

export function initContentModels(sequelize: Sequelize): void {
  Profile.init(
    {
      id,
      name: { type: DataTypes.STRING(100), allowNull: false },
      title: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: false },
      tagline: { type: DataTypes.STRING(200), allowNull: false },
      summary: { type: DataTypes.TEXT, allowNull: false },
      ...timestamps,
    },
    { sequelize, tableName: "profiles" },
  );

  Tag.init(
    {
      id,
      slug: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      label: { type: DataTypes.STRING(60), allowNull: false },
      ...timestamps,
    },
    { sequelize, tableName: "tags" },
  );

  Technology.init(
    {
      id,
      name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      ...timestamps,
    },
    { sequelize, tableName: "technologies" },
  );

  Project.init(
    {
      id,
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      title: { type: DataTypes.STRING(120), allowNull: false },
      organisation: { type: DataTypes.STRING(120), allowNull: true },
      summary: { type: DataTypes.STRING(300), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      repoUrl: { type: DataTypes.STRING(300), allowNull: true },
      liveUrl: { type: DataTypes.STRING(300), allowNull: true },
      coverImage: { type: DataTypes.STRING(200), allowNull: true },
      featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sortOrder,
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    },
    { sequelize, tableName: "projects" },
  );

  ProjectTag.init(
    {
      projectId: { type: DataTypes.INTEGER, primaryKey: true },
      tagId: { type: DataTypes.INTEGER, primaryKey: true },
    },
    { sequelize, tableName: "project_tags", timestamps: false },
  );

  ProjectTechnology.init(
    {
      projectId: { type: DataTypes.INTEGER, primaryKey: true },
      technologyId: { type: DataTypes.INTEGER, primaryKey: true },
      sortOrder,
    },
    { sequelize, tableName: "project_technologies", timestamps: false },
  );

  Experience.init(
    {
      id,
      organisation: { type: DataTypes.STRING(120), allowNull: false },
      role: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      highlights: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      sortOrder,
      ...timestamps,
    },
    { sequelize, tableName: "experiences" },
  );

  Skill.init(
    {
      id,
      name: { type: DataTypes.STRING(60), allowNull: false },
      category: { type: DataTypes.STRING(60), allowNull: false },
      sortOrder,
      ...timestamps,
    },
    { sequelize, tableName: "skills" },
  );

  Certification.init(
    {
      id,
      name: { type: DataTypes.STRING(150), allowNull: false },
      issuer: { type: DataTypes.STRING(100), allowNull: false },
      issuedOn: { type: DataTypes.DATEONLY, allowNull: false },
      credentialUrl: { type: DataTypes.STRING(300), allowNull: true },
      sortOrder,
      ...timestamps,
    },
    { sequelize, tableName: "certifications" },
  );

  Education.init(
    {
      id,
      institution: { type: DataTypes.STRING(150), allowNull: false },
      qualification: { type: DataTypes.STRING(150), allowNull: false },
      location: { type: DataTypes.STRING(100), allowNull: true },
      endYear: { type: DataTypes.SMALLINT, allowNull: true },
      sortOrder,
      ...timestamps,
    },
    { sequelize, tableName: "education" },
  );

  // Model classes are module singletons. Associations live on the class, so a second
  // Sequelize instance (tests, scripts) re-binds the models but must not re-associate them.
  if ("tags" in Project.associations) return;

  Project.belongsToMany(Tag, {
    through: ProjectTag,
    as: "tags",
    foreignKey: "projectId",
    otherKey: "tagId",
  });
  Tag.belongsToMany(Project, {
    through: ProjectTag,
    as: "projects",
    foreignKey: "tagId",
    otherKey: "projectId",
  });
  Project.belongsToMany(Technology, {
    through: ProjectTechnology,
    as: "technologies",
    foreignKey: "projectId",
    otherKey: "technologyId",
  });
  Technology.belongsToMany(Project, {
    through: ProjectTechnology,
    as: "projects",
    foreignKey: "technologyId",
    otherKey: "projectId",
  });
}
