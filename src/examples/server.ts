require('dotenv').config();

// import express from 'express';
import mongoose from 'mongoose';
import { LinkedInProfileScraper } from '../index';

// const STARTING_PROFILE = 'https://www.linkedin.com/in/luis-lima-09134135/';

(async () => {

  await mongoose.connect('mongodb://localhost/linkedin_scraped_data', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  }).catch(console.log);

  const Schema = mongoose.Schema;

  const AvailableProfilesSchema = new Schema({
    url: {
      type: String,
      unique: true
    },
    has_linked_profiles_been_scraped: Boolean,
  });

  const AvailableProfiles = mongoose.model('AvailableProfiles', AvailableProfilesSchema);

  // Setup environment variables to fill the sessionCookieValue
  const scraper = new LinkedInProfileScraper({
    sessionCookieValue: `${process.env.LINKEDIN_SESSION_COOKIE_VALUE}`,
    keepAlive: true,
  })

  // Prepare the scraper
  // Loading it in memory
  await scraper.setup();

  while (true) {
    const availableProfile: any = await AvailableProfiles.findOne({
      has_linked_profiles_been_scraped: false,
    }).skip(parseInt(process.env.SKIP_NUMBER || '0') || 0);

    console.log(availableProfile);

    const linkedProfiles = await scraper.getLinkedProfiles(availableProfile.url);
    const {
      peopleYouMayKnow,
      peopleAlsoViewed
    } = linkedProfiles;

    console.log({
      peopleYouMayKnow,
      peopleAlsoViewed
    })

    for (let i = 0; i < peopleAlsoViewed.length; i++) {
      await AvailableProfiles.create({
        url: peopleAlsoViewed[i],
        has_linked_profiles_been_scraped: false
      }).catch(() => console.log('duplicate found'));
    }

    for (let i = 0; i < peopleYouMayKnow.length; i++) {
      await AvailableProfiles.create({
        url: peopleYouMayKnow[i],
        has_linked_profiles_been_scraped: false
      }).catch(() => console.log('duplicate found'));
    }

    await AvailableProfiles.findOneAndUpdate({
      url: availableProfile.url,
    }, {
      has_linked_profiles_been_scraped: true
    }).catch(console.log);
  }

})()
