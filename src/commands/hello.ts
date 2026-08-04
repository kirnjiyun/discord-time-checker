import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types/command';

const hello: Command = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('봇이 인사합니다.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('인사할 상대 (비우면 본인)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') ?? interaction.user;

    await interaction.reply(
      target.id === interaction.user.id
        ? `안녕하세요, ${target}님! 👋`
        : `${interaction.user} 님이 ${target} 님에게 인사를 건넸어요! 👋`,
    );
  },
};

export default hello;
