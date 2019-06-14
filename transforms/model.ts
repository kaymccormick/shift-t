import Sequelize, { Model } from 'sequelize';
class File extends Model {
}
File.init({ path: { type: Sequelize.STRING } });

export { File };
