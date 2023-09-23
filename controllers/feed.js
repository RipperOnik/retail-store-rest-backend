const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket')

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  const page = req.query.page ?? 1
  const perPage = 2
  try {
    const totalItems = await Post.countDocuments()
    const posts = await Post.find().populate('creator').sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage)

    res
      .status(200)
      .json({ message: 'Fetched posts successfully.', posts, totalItems })

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided.');
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path;
  const title = req.body.title;
  const content = req.body.content;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId
  });
  let loadedUser
  post
    .save()
    .then(result => {
      return User.findById(req.userId)
    })
    .then(user => {
      if (!user) {
        const error = new Error('No User Found')
        error.statusCode = 500
        throw error
      }
      loadedUser = user
      user.posts.push(post)
      return user.save()
    })
    .then(result => {
      // notify all clients that new post was added
      io.getIO().emit('posts', {
        action: 'create',
        post: { ...post._doc, creator: { _id: req.userId, name: loadedUser.name } }
      })
      res.status(201).json({
        message: 'Post created successfully!',
        post: post,
        creator: { _id: loadedUser._id, name: loadedUser.name }
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: 'Post fetched.', post: post });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error('No file picked.');
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const error = new Error('Unauthorized');
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then(result => {
      io.getIO().emit('posts', {
        action: 'update',
        post: result
      })
      res.status(200).json({ message: 'Post updated!', post: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.deletePost = (req, res, next) => {
  const postId = req.params.postId
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const error = new Error('Unauthorized');
        error.statusCode = 403;
        throw error;
      }
      clearImage(post.imageUrl)
      return User.findById(req.userId)
    })
    .then(user => {
      user.posts.pull(postId)
      return user.save()
    })
    .then(result => {
      return Post.findByIdAndRemove(postId)
    })
    .then(result => {
      io.getIO().emit('posts', {
        action: 'delete',
        post: result
      })
      res.status(200).json({
        message: 'Deleted post.'
      })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
}

exports.getStatus = (req, res, next) => {
  User.findById(req.userId)
    .then(user => {
      if (!user) {
        const error = new Error('No User Found')
        error.statusCode = 403
        throw error
      }
      res.status(200).json({
        status: user.status
      })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    })
}
exports.updateStatus = (req, res, next) => {
  const userId = req.userId
  const newStatus = req.body.status
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const error = new Error('Status was not provided')
    error.statusCode = 422
    throw error
  }
  User.findById(userId)
    .then(user => {
      if (!user) {
        const error = new Error('No User Found')
        error.statusCode = 403
        throw error
      }
      if (user.status === newStatus) {
        const error = new Error('Status is the same')
        error.statusCode = 422
        throw error
      }
      user.status = newStatus
      return user.save()
    })
    .then(result => {
      res.status(200).json({
        message: 'Status updated',
        status: newStatus
      })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    })
}

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
